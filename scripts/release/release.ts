/**
 * StoneFlow 应用更新发布脚本
 *
 * 用法:
 *   bun run release
 *   bun run scripts/release/release.ts stable [--no-upload]
 *   bun run scripts/release/release.ts beta [--no-upload]
 *   bun run scripts/release/release.ts beta --version 0.1.1-beta.1
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

function getArg(name: string): string | undefined {
	const idx = argv.indexOf(name)
	return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1] : undefined
}

function resolvePlatformKey() {
	const os = process.platform === 'darwin' ? 'darwin' : process.platform
	const arch =
		process.arch === 'arm64' ? 'aarch64' : process.arch === 'x64' ? 'x86_64' : process.arch
	if (os === 'win32') return `windows-${arch}`
	if (os === 'darwin') return `darwin-${arch}`
	if (os === 'linux') return `linux-${arch}`
	throw new Error(`不支持当前发布平台: ${process.platform}-${process.arch}`)
}

async function resolveGitCommit() {
	try {
		return (await $`git rev-parse --short=8 HEAD`.quiet().text()).trim()
	} catch {
		return 'unknown'
	}
}

async function fetchJson<T>(url: string) {
	const response = await fetch(url, {
		signal: AbortSignal.timeout(5000),
	})
	if (response.status === 404) return null
	if (!response.ok) {
		throw new Error(`读取远端 JSON 失败: ${url} HTTP ${response.status}`)
	}
	return (await response.json()) as T
}

function parseBetaVersion(version: string, betaBaseVersion: string) {
	const match = new RegExp(`^${betaBaseVersion.replaceAll('.', '\\.')}-beta\\.(\\d+)$`).exec(
		version,
	)
	return match ? Number(match[1]) : null
}

async function readRemoteMeta(channel: 'stable' | 'beta', platformKey: string) {
	const url = `${R2_PUBLIC_URL}/updates/${channel}/${platformKey}/latest.meta.json`
	try {
		return await fetchJson<ReleaseMeta>(url)
	} catch (error) {
		if (!NO_UPLOAD) throw error
		console.log(chalk.yellow(`   无法读取远端 meta，--no-upload 将使用本地默认版本`))
		return null
	}
}

async function resolveReleaseVersion(
	channel: 'stable' | 'beta',
	stableVersion: string,
	platformKey: string,
	commit: string,
) {
	if (!parseStableVersion(stableVersion)) {
		throw new Error(`配置版本必须是 x.y.z，当前是 ${stableVersion}`)
	}
	const specifiedVersion = getArg('--version')
	if (specifiedVersion) return specifiedVersion
	if (channel === 'stable') return stableVersion

	const betaBaseVersion = nextPatchVersion(stableVersion)
	const remoteMeta = await readRemoteMeta(channel, platformKey)
	if (remoteMeta?.commit === commit && remoteMeta.version) {
		return remoteMeta.version
	}
	const latestBetaNumber = remoteMeta ? parseBetaVersion(remoteMeta.version, betaBaseVersion) : null
	return `${betaBaseVersion}-beta.${latestBetaNumber ? latestBetaNumber + 1 : 1}`
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
const CHANNEL =
	argv.find((arg): arg is 'stable' | 'beta' => arg === 'stable' || arg === 'beta') ?? 'stable'
const NO_UPLOAD = argv.includes('--no-upload')
const SIGNING_PRIVATE_KEY = expandHomePath(
	process.env.TAURI_SIGNING_PRIVATE_KEY ?? process.env.TAURI_SIGNING_PRIVATE_KEY_PATH,
)
const PLATFORM_KEY = resolvePlatformKey()

// Tauri 构建输出目录
const TAURI_DIST = path.resolve(import.meta.dir, '../../src-tauri/target/release/bundle')
// 临时工作目录
const WORK_DIR = path.resolve(import.meta.dir, '../../.release-tmp')
const UPDATES_DIR = path.join(WORK_DIR, 'updates', CHANNEL, PLATFORM_KEY)
const DOWNLOADS_DIR = path.join(WORK_DIR, 'downloads', CHANNEL, PLATFORM_KEY)

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

interface ReleaseMeta {
	version: string
	channel: 'stable' | 'beta'
	platform: string
	commit: string
	sourceVersion: string
	createdAt: string
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
console.log(chalk.gray(`   发布平台: ${PLATFORM_KEY}`))

// 1. 清理临时目录
await emptyDir(WORK_DIR)
await mkdir(UPDATES_DIR, { recursive: true })
await mkdir(DOWNLOADS_DIR, { recursive: true })

// 2. 读取当前版本
const tauriConfPath = path.resolve(import.meta.dir, '../../src-tauri/tauri.conf.json')
const tauriConf = await readJSON<{ version: string }>(tauriConfPath)
const SOURCE_VERSION = tauriConf.version
const COMMIT = await resolveGitCommit()
const VERSION = await resolveReleaseVersion(CHANNEL, SOURCE_VERSION, PLATFORM_KEY, COMMIT)
console.log(chalk.gray(`   配置版本: ${SOURCE_VERSION}`))
console.log(chalk.gray(`   发布版本: ${VERSION}`))
console.log(chalk.gray(`   Git 提交: ${COMMIT}`))

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
	if (CHANNEL === 'beta' && PLATFORM_KEY.startsWith('windows-')) {
		console.log(
			chalk.yellow('   Windows beta 版本跳过 MSI，仅构建 NSIS（MSI 不支持 beta 预发布标识）'),
		)
		await $`bun run tauri build --bundles nsis`
	} else {
		await $`bun run tauri build`
	}
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
	const versionedUpdatesDir = path.join(UPDATES_DIR, VERSION)
	await mkdir(versionedUpdatesDir, { recursive: true })
	const targetPath = path.join(versionedUpdatesDir, targetFileName)
	const targetSigPath = path.join(versionedUpdatesDir, `${targetFileName}.sig`)

	await copyFile(filePath, targetPath)
	await copyFile(sigPath, targetSigPath)
	platforms[platformKey] = {
		url: `${R2_PUBLIC_URL}/updates/${CHANNEL}/${platformKey}/${VERSION}/${targetFileName}`,
		signature: signature.trim(),
	}
	uploadItems.push(
		{
			filePath: targetPath,
			key: `stoneflow/updates/${CHANNEL}/${platformKey}/${VERSION}/${targetFileName}`,
		},
		{
			filePath: targetSigPath,
			key: `stoneflow/updates/${CHANNEL}/${platformKey}/${VERSION}/${targetFileName}.sig`,
		},
	)
	console.log(chalk.green(`   ✓ ${platformKey}: ${targetFileName}`))
}

async function addDownloadArtifact(filePath: string, latestFileName: string) {
	const fileName = path.basename(filePath)
	const versionedDownloadsDir = path.join(DOWNLOADS_DIR, VERSION)
	await mkdir(versionedDownloadsDir, { recursive: true })
	const targetPath = path.join(versionedDownloadsDir, fileName)
	const latestPath = path.join(DOWNLOADS_DIR, latestFileName)

	await copyFile(filePath, targetPath)
	await copyFile(filePath, latestPath)
	uploadItems.push(
		{
			filePath: targetPath,
			key: `stoneflow/downloads/${CHANNEL}/${PLATFORM_KEY}/${VERSION}/${fileName}`,
		},
		{
			filePath: latestPath,
			key: `stoneflow/downloads/${CHANNEL}/${PLATFORM_KEY}/${latestFileName}`,
		},
	)
	console.log(chalk.green(`   ✓ 下载包: ${fileName}`))
}

// macOS updater 使用 .app.tar.gz；dmg 只给用户手动下载安装。
const macUpdaterFiles = await glob(`${TAURI_DIST}/macos/*.app.tar.gz`)
const macUpdaterSigFiles = await glob(`${TAURI_DIST}/macos/*.app.tar.gz.sig`)
const dmgFiles = await glob(`${TAURI_DIST}/dmg/*.dmg`)

if (macUpdaterFiles.length > 0 && macUpdaterSigFiles.length > 0) {
	await addUpdaterArtifact(
		PLATFORM_KEY,
		macUpdaterFiles[0],
		macUpdaterSigFiles[0],
		`StoneFlow_${VERSION}_${PLATFORM_KEY.replace('darwin-', '')}.app.tar.gz`,
	)
}

if (dmgFiles.length > 0) {
	await addDownloadArtifact(dmgFiles[0], 'latest.dmg')
}

// 查找 Linux AppImage 及签名
const appimageFiles = await glob(`${TAURI_DIST}/appimage/*.AppImage.tar.gz`)
const appimageSigFiles = await glob(`${TAURI_DIST}/appimage/*.AppImage.tar.gz.sig`)

if (appimageFiles.length > 0 && appimageSigFiles.length > 0) {
	await addUpdaterArtifact(PLATFORM_KEY, appimageFiles[0], appimageSigFiles[0])
	await addDownloadArtifact(appimageFiles[0], 'latest.AppImage.tar.gz')
}

// Windows updater 优先使用 NSIS 安装器；如果当前构建未生成 NSIS，则回退到 MSI。
const nsisFiles = await glob(`${TAURI_DIST}/nsis/*.exe`)
const nsisSigFiles = await glob(`${TAURI_DIST}/nsis/*.exe.sig`)
const msiFiles = await glob(`${TAURI_DIST}/msi/*.msi`)
const msiSigFiles = await glob(`${TAURI_DIST}/msi/*.msi.sig`)

if (nsisFiles.length > 0 && nsisSigFiles.length > 0) {
	await addUpdaterArtifact(PLATFORM_KEY, nsisFiles[0], nsisSigFiles[0])
	await addDownloadArtifact(nsisFiles[0], 'latest-setup.exe')
} else if (msiFiles.length > 0 && msiSigFiles.length > 0) {
	await addUpdaterArtifact(PLATFORM_KEY, msiFiles[0], msiSigFiles[0])
	await addDownloadArtifact(msiFiles[0], 'latest.msi')
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
const latestMeta: ReleaseMeta = {
	version: VERSION,
	channel: CHANNEL,
	platform: PLATFORM_KEY,
	commit: COMMIT,
	sourceVersion: SOURCE_VERSION,
	createdAt: latestJson.pub_date,
}

const latestJsonPath = path.join(UPDATES_DIR, 'latest.json')
await writeJSON(latestJsonPath, latestJson)
uploadItems.push({
	filePath: latestJsonPath,
	key: `stoneflow/updates/${CHANNEL}/${PLATFORM_KEY}/latest.json`,
})
const latestMetaPath = path.join(UPDATES_DIR, 'latest.meta.json')
await writeJSON(latestMetaPath, latestMeta)
uploadItems.push({
	filePath: latestMetaPath,
	key: `stoneflow/updates/${CHANNEL}/${PLATFORM_KEY}/latest.meta.json`,
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
	const isMutableFile =
		fileName === 'latest.json' ||
		fileName === 'latest.meta.json' ||
		fileName.startsWith('latest.') ||
		fileName.startsWith('latest-')

	console.log(chalk.gray(`   上传 ${item.key}...`))

	await s3Client.send(
		new PutObjectCommand({
			Bucket: R2_BUCKET,
			Key: item.key,
			Body: body,
			ContentType: fileName.endsWith('.json') ? 'application/json' : 'application/octet-stream',
			CacheControl: isMutableFile ? 'no-cache' : 'public, max-age=31536000, immutable',
		}),
	)

	console.log(chalk.green(`   ✓ ${fileName}`))
}

// 9. 完成
console.log(chalk.green('\n✅ 发布完成!'))
console.log(
	chalk.gray(`\n   更新地址: ${R2_PUBLIC_URL}/updates/${CHANNEL}/${PLATFORM_KEY}/latest.json`),
)
console.log(chalk.gray(`   下载目录: ${R2_PUBLIC_URL}/downloads/${CHANNEL}/${PLATFORM_KEY}/`))
console.log(chalk.gray(`   版本: ${VERSION}`))
console.log(chalk.gray(`   平台: ${Object.keys(platforms).join(', ')}\n`))

// 清理临时目录
await rm(WORK_DIR, { recursive: true, force: true })
