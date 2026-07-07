/**
 * StoneFlow 应用更新发布脚本
 *
 * 用法:
 *   bun run scripts/release/release.ts stable [--no-upload]
 *   bun run scripts/release/release.ts beta [--no-upload]
 */

import { $, argv } from 'bun'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

const color = (code: number) => (text: string) => `\x1b[${code}m${text}\x1b[0m`
const chalk = {
	red: color(31),
	green: color(32),
	yellow: color(33),
	blue: color(34),
	gray: color(90),
	cyan: color(36),
}

async function emptyDir(dir: string) {
	await rm(dir, { recursive: true, force: true })
	await mkdir(dir, { recursive: true })
}

async function readJSON<T>(filePath: string): Promise<T> {
	return JSON.parse(await readFile(filePath, 'utf8')) as T
}

async function writeJSON(filePath: string, data: unknown) {
	await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

function parseStableVersion(version: string) {
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
	if (!match) return null
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
	}
}

function nextPatchVersion(version: string) {
	const parsed = parseStableVersion(version)
	if (!parsed) {
		throw new Error(`stable 版本必须是 x.y.z，当前是 ${version}`)
	}
	return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`
}

async function readLatestBetaVersion() {
	const response = await fetch(`${R2_PUBLIC_URL}/updates/beta/latest.json`, {
		signal: AbortSignal.timeout(5000),
	})
	if (response.status === 404) return null
	if (!response.ok) {
		throw new Error(`读取 beta latest.json 失败: HTTP ${response.status}`)
	}
	const data = (await response.json()) as { version?: unknown }
	return typeof data.version === 'string' ? data.version : null
}

async function resolveReleaseVersion(channel: 'stable' | 'beta', stableVersion: string) {
	if (!parseStableVersion(stableVersion)) {
		throw new Error(`配置版本必须是 x.y.z，当前是 ${stableVersion}`)
	}
	if (channel === 'stable') return stableVersion

	const betaBaseVersion = nextPatchVersion(stableVersion)
	try {
		const latestBetaVersion = await readLatestBetaVersion()
		const match = new RegExp(`^${betaBaseVersion.replaceAll('.', '\\.')}-beta\\.(\\d+)$`).exec(
			latestBetaVersion ?? '',
		)
		const nextBetaNumber = match ? Number(match[1]) + 1 : 1
		return `${betaBaseVersion}-beta.${nextBetaNumber}`
	} catch (error) {
		if (!NO_UPLOAD) throw error
		console.log(
			chalk.yellow(`   无法读取远端 beta 版本，--no-upload 使用 ${betaBaseVersion}-beta.1`),
		)
		return `${betaBaseVersion}-beta.1`
	}
}

async function glob(pattern: string) {
	if (!existsSync(path.dirname(pattern))) return []
	try {
		const files = await Array.fromAsync(new Bun.Glob(pattern).scan('/'))
		return files.filter((file) => !file.includes('\0') && existsSync(file))
	} catch (error) {
		if ((error as { code?: string }).code === 'ENOENT') return []
		throw error
	}
}

function expandHomePath(filePath: string | undefined) {
	if (!filePath) return undefined
	if (filePath === '~') return homedir()
	if (filePath.startsWith('~/')) return path.join(homedir(), filePath.slice(2))
	return filePath
}

// 配置
const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://release.sty20030818.space/stoneflow'
const R2_BUCKET = process.env.R2_BUCKET_NAME || ''
const CHANNEL = argv.find((arg): arg is 'stable' | 'beta' => arg === 'stable' || arg === 'beta')
const NO_UPLOAD = argv.includes('--no-upload')
const SIGNING_PRIVATE_KEY = expandHomePath(
	process.env.TAURI_SIGNING_PRIVATE_KEY ?? process.env.TAURI_SIGNING_PRIVATE_KEY_PATH,
)
const MAC_ARCH = process.arch === 'arm64' ? 'aarch64' : 'x86_64'

// Tauri 构建输出目录
const TAURI_DIST = path.resolve(import.meta.dir, '../../src-tauri/target/release/bundle')
// 临时工作目录
const WORK_DIR = path.resolve(import.meta.dir, '../../.release-tmp')
const UPDATES_DIR = path.join(WORK_DIR, 'updates')
const DOWNLOADS_DIR = path.join(WORK_DIR, 'downloads')

interface PlatformMeta {
	url: string
	signature: string
}

interface LatestJson {
	version: string
	notes: string
	pub_date: string
	platforms: Record<string, PlatformMeta>
}

interface UploadItem {
	filePath: string
	key: string
}

if (!CHANNEL || !['stable', 'beta'].includes(CHANNEL)) {
	console.error(chalk.red('错误: 请指定渠道 (stable 或 beta)'))
	process.exit(1)
}

console.log(chalk.blue(`\n🚀 开始发布 ${CHANNEL} 渠道更新...\n`))

// 1. 清理临时目录
await emptyDir(WORK_DIR)
await mkdir(UPDATES_DIR, { recursive: true })
await mkdir(DOWNLOADS_DIR, { recursive: true })

// 2. 读取当前版本
const tauriConfPath = path.resolve(import.meta.dir, '../../src-tauri/tauri.conf.json')
const tauriConf = await readJSON<{ version: string }>(tauriConfPath)
const SOURCE_VERSION = tauriConf.version
const VERSION = await resolveReleaseVersion(CHANNEL, SOURCE_VERSION)
console.log(chalk.gray(`   配置版本: ${SOURCE_VERSION}`))
console.log(chalk.gray(`   发布版本: ${VERSION}`))

// 3. 构建 Tauri 应用
console.log(chalk.gray('\n📦 构建应用...\n'))
const tauriEnv = { ...process.env }
if (SIGNING_PRIVATE_KEY) tauriEnv.TAURI_SIGNING_PRIVATE_KEY = SIGNING_PRIVATE_KEY
if (process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
	tauriEnv.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD
}
$.env(tauriEnv)
if (VERSION !== SOURCE_VERSION) {
	await writeJSON(tauriConfPath, { ...tauriConf, version: VERSION })
}
try {
	await $`bun run tauri build`
} finally {
	if (VERSION !== SOURCE_VERSION) {
		await writeJSON(tauriConfPath, tauriConf)
	}
}

// 4. 收集构建产物
console.log(chalk.gray('\n🔍 收集构建产物...\n'))

const platforms: Record<string, PlatformMeta> = {}
const uploadItems: UploadItem[] = []

async function addUpdaterArtifact(
	platformKey: string,
	filePath: string,
	sigPath: string,
	targetFileName = path.basename(filePath),
) {
	const signature = await readFile(sigPath, 'utf8')
	const targetPath = path.join(UPDATES_DIR, targetFileName)
	const targetSigPath = path.join(UPDATES_DIR, `${targetFileName}.sig`)

	await copyFile(filePath, targetPath)
	await copyFile(sigPath, targetSigPath)
	platforms[platformKey] = {
		url: `${R2_PUBLIC_URL}/updates/${CHANNEL}/${targetFileName}`,
		signature: signature.trim(),
	}
	uploadItems.push(
		{
			filePath: targetPath,
			key: `stoneflow/updates/${CHANNEL}/${targetFileName}`,
		},
		{
			filePath: targetSigPath,
			key: `stoneflow/updates/${CHANNEL}/${targetFileName}.sig`,
		},
	)
	console.log(chalk.green(`   ✓ ${platformKey}: ${targetFileName}`))
}

// macOS updater 使用 .app.tar.gz；dmg 只给用户手动下载安装。
const macUpdaterFiles = await glob(`${TAURI_DIST}/macos/*.app.tar.gz`)
const macUpdaterSigFiles = await glob(`${TAURI_DIST}/macos/*.app.tar.gz.sig`)
const dmgFiles = await glob(`${TAURI_DIST}/dmg/*.dmg`)

if (macUpdaterFiles.length > 0 && macUpdaterSigFiles.length > 0) {
	await addUpdaterArtifact(
		`darwin-${MAC_ARCH}`,
		macUpdaterFiles[0],
		macUpdaterSigFiles[0],
		`StoneFlow_${VERSION}_${MAC_ARCH}.app.tar.gz`,
	)
}

if (dmgFiles.length > 0) {
	const fileName = path.basename(dmgFiles[0])
	const targetPath = path.join(DOWNLOADS_DIR, fileName)
	const latestPath = path.join(DOWNLOADS_DIR, `latest-macos-${MAC_ARCH}.dmg`)

	await copyFile(dmgFiles[0], targetPath)
	await copyFile(dmgFiles[0], latestPath)
	uploadItems.push(
		{
			filePath: targetPath,
			key: `stoneflow/downloads/${CHANNEL}/${fileName}`,
		},
		{
			filePath: latestPath,
			key: `stoneflow/downloads/${CHANNEL}/latest-macos-${MAC_ARCH}.dmg`,
		},
	)
	console.log(chalk.green(`   ✓ macOS 下载包: ${fileName}`))
}

// 查找 Linux AppImage 及签名
const appimageFiles = await glob(`${TAURI_DIST}/appimage/*.AppImage.tar.gz`)
const appimageSigFiles = await glob(`${TAURI_DIST}/appimage/*.AppImage.tar.gz.sig`)

if (appimageFiles.length > 0 && appimageSigFiles.length > 0) {
	await addUpdaterArtifact('linux-x86_64', appimageFiles[0], appimageSigFiles[0])
}

// 查找 Windows MSI 及签名
const msiFiles = await glob(`${TAURI_DIST}/msi/*.msi.zip`)
const msiSigFiles = await glob(`${TAURI_DIST}/msi/*.msi.zip.sig`)

if (msiFiles.length > 0 && msiSigFiles.length > 0) {
	await addUpdaterArtifact('windows-x86_64', msiFiles[0], msiSigFiles[0])
}

if (Object.keys(platforms).length === 0) {
	console.error(chalk.red('\n❌ 错误: 未找到任何构建产物，请检查构建是否成功'))
	process.exit(1)
}

// 5. 读取更新说明（如果存在 RELEASE_NOTES.md）
const notesPath = path.resolve(import.meta.dir, '../../RELEASE_NOTES.md')
let notes = ''
if (existsSync(notesPath)) {
	notes = await readFile(notesPath, 'utf8')
}

// 6. 生成 latest.json
const latestJson: LatestJson = {
	version: VERSION,
	notes,
	pub_date: new Date().toISOString(),
	platforms,
}

const latestJsonPath = path.join(UPDATES_DIR, 'latest.json')
await writeJSON(latestJsonPath, latestJson)
uploadItems.push({
	filePath: latestJsonPath,
	key: `stoneflow/updates/${CHANNEL}/latest.json`,
})
console.log(chalk.gray('\n📝 生成 latest.json'))

// 7. 输出到控制台预览
console.log(chalk.gray('\n────────────────────────────────────────'))
console.log(chalk.cyan('更新清单预览:'))
console.log(JSON.stringify(latestJson, null, 2))
console.log(chalk.gray('────────────────────────────────────────\n'))

if (NO_UPLOAD) {
	console.log(chalk.yellow('⚠️  --no-upload 模式，跳过上传'))
	console.log(chalk.gray(`   构建产物已保存到: ${WORK_DIR}`))
	process.exit(0)
}

// 8. 上传到 R2
if (
	!R2_BUCKET ||
	!process.env.R2_ACCESS_KEY_ID ||
	!process.env.R2_SECRET_ACCESS_KEY ||
	!process.env.R2_ACCOUNT_ID
) {
	console.error(chalk.red('\n❌ 错误: 缺少 R2 配置环境变量'))
	console.error(
		chalk.gray(
			'   需要设置: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME',
		),
	)
	console.log(chalk.yellow('\n💡 提示: 构建产物已保存到:'), WORK_DIR)
	console.log(chalk.yellow('   你可以按 .release-tmp 下的 updates / downloads 目录手动上传到 R2'))
	process.exit(1)
}

console.log(chalk.blue(`☁️  上传到 Cloudflare R2 (${R2_BUCKET})...\n`))

const s3Client = new S3Client({
	region: 'auto',
	endpoint: R2_ENDPOINT,
	credentials: {
		accessKeyId: process.env.R2_ACCESS_KEY_ID!,
		secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
	},
})

for (const item of uploadItems) {
	const fileName = path.basename(item.filePath)
	const body = await readFile(item.filePath)

	console.log(chalk.gray(`   上传 ${item.key}...`))

	await s3Client.send(
		new PutObjectCommand({
			Bucket: R2_BUCKET,
			Key: item.key,
			Body: body,
			ContentType: fileName.endsWith('.json') ? 'application/json' : 'application/octet-stream',
			CacheControl: fileName === 'latest.json' ? 'no-cache' : 'public, max-age=31536000, immutable',
		}),
	)

	console.log(chalk.green(`   ✓ ${fileName}`))
}

// 9. 完成
console.log(chalk.green('\n✅ 发布完成!'))
console.log(chalk.gray(`\n   更新地址: ${R2_PUBLIC_URL}/updates/${CHANNEL}/latest.json`))
console.log(
	chalk.gray(`   下载地址: ${R2_PUBLIC_URL}/downloads/${CHANNEL}/latest-macos-${MAC_ARCH}.dmg`),
)
console.log(chalk.gray(`   版本: ${VERSION}`))
console.log(chalk.gray(`   平台: ${Object.keys(platforms).join(', ')}\n`))

// 清理临时目录
await rm(WORK_DIR, { recursive: true, force: true })
