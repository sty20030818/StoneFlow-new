/**
 * StoneFlow 应用更新发布脚本
 *
 * 用法:
 *   bun run release
 *   bun run scripts/release/release.ts stable [--no-upload]
 *   bun run scripts/release/release.ts beta [--no-upload]
 *   bun run scripts/release/release.ts beta --version 0.1.1-beta.1
 *
 * 产物安全原则（防“版本新、包旧”）:
 *   1. 构建前清空本平台 bundle 输出目录，杜绝历史安装包残留
 *   2. 按本次 VERSION 精确匹配产物文件名，禁止 files[0]
 *   3. 签名必须与产物一一配对（同路径 .sig）
 *   4. 生成 latest.json 后、上传前做一致性校验
 */

import { $, argv } from 'bun'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
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

/** Tauri bundle 输出子目录：发布前一律清空，避免扫到旧包 */
const BUNDLE_OUTPUT_DIRS = ['nsis', 'msi', 'dmg', 'macos', 'appimage'] as const

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

function expandHomePath(filePath: string | undefined) {
	if (!filePath) return undefined
	if (filePath === '~') return homedir()
	if (filePath.startsWith('~/')) return path.join(homedir(), filePath.slice(2))
	return filePath
}

/** Tauri 产物文件名中的版本标记，如 `_0.1.1-beta.2_` */
function versionNameToken(version: string) {
	return `_${version}_`
}

function fileNameContainsVersion(filePath: string, version: string) {
	return path.basename(filePath).includes(versionNameToken(version))
}

function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function describeArtifact(filePath: string) {
	const info = await stat(filePath)
	return {
		path: filePath,
		name: path.basename(filePath),
		size: info.size,
		mtime: info.mtime.toISOString(),
	}
}

async function logArtifact(label: string, filePath: string) {
	const desc = await describeArtifact(filePath)
	console.log(chalk.green(`   ✓ ${label}: ${desc.name}`))
	console.log(chalk.gray(`     path : ${desc.path}`))
	console.log(chalk.gray(`     size : ${formatBytes(desc.size)} (${desc.size} bytes)`))
	console.log(chalk.gray(`     mtime: ${desc.mtime}`))
}

/**
 * 列出目录中符合条件的文件（非递归）。
 * 不依赖 Glob 顺序，后续按版本语义筛选。
 */
async function listDirFiles(
	dir: string,
	predicate: (fileName: string) => boolean,
): Promise<string[]> {
	if (!existsSync(dir)) return []
	const entries = await readdir(dir, { withFileTypes: true })
	return entries
		.filter((entry) => entry.isFile() && predicate(entry.name))
		.map((entry) => path.join(dir, entry.name))
		.sort((a, b) => path.basename(a).localeCompare(path.basename(b)))
}

/**
 * 从候选产物中唯一解析出本次版本对应文件。
 *
 * 策略:
 * - requireVersionInName=true：文件名必须包含 `_${VERSION}_`，且唯一
 * - requireVersionInName=false：优先版本匹配；否则在目录已清空前提下只允许恰好 1 个候选
 */
function resolveUniqueArtifact(
	candidates: string[],
	version: string,
	label: string,
	requireVersionInName: boolean,
): string | null {
	if (candidates.length === 0) return null

	const versionMatched = candidates.filter((file) => fileNameContainsVersion(file, version))
	const names = (files: string[]) => files.map((f) => path.basename(f)).join(', ')

	if (requireVersionInName) {
		if (versionMatched.length === 1) return versionMatched[0]!
		if (versionMatched.length === 0) {
			throw new Error(
				`${label}: 未找到包含 ${versionNameToken(version)} 的产物。候选: ${names(candidates) || '(无)'}`,
			)
		}
		throw new Error(
			`${label}: 找到多个匹配版本 ${version} 的产物，拒绝猜测: ${names(versionMatched)}`,
		)
	}

	if (versionMatched.length === 1) return versionMatched[0]!
	if (versionMatched.length > 1) {
		throw new Error(
			`${label}: 找到多个匹配版本 ${version} 的产物，拒绝猜测: ${names(versionMatched)}`,
		)
	}
	if (candidates.length === 1) return candidates[0]!

	throw new Error(
		`${label}: 无法唯一确定产物（目录应在构建前清空）。候选: ${names(candidates)}`,
	)
}

async function requireSignaturePair(artifactPath: string): Promise<string> {
	const sigPath = `${artifactPath}.sig`
	if (!existsSync(sigPath)) {
		throw new Error(`缺少签名文件: ${sigPath}（对应产物 ${path.basename(artifactPath)}）`)
	}
	return sigPath
}

/**
 * 校验 Tauri 生成的 .sig 是否声明了正确的 file: 文件名。
 *
 * 注意：`.sig` 磁盘内容通常是**整段 base64**；解码后才是 minisign 风格文本，例如：
 *   untrusted comment: signature from tauri secret key
 *   ...
 *   untrusted comment: timestamp:...
 *   file:StoneFlow_x.y.z_x64-setup.exe
 *   ...
 * 只做文件名一致性防御，不解析密码学签名。
 */
async function assertSignatureMentionsFile(sigPath: string, artifactFileName: string) {
	const raw = (await readFile(sigPath, 'utf8')).trim()
	if (!raw) {
		throw new Error(`签名文件为空: ${path.basename(sigPath)}`)
	}

	// Tauri updater 的 .sig 一般为 base64 包装；解码失败则退回原文检查
	let decoded = raw
	try {
		const asUtf8 = Buffer.from(raw, 'base64').toString('utf8')
		// 解码后应能看到 untrusted comment / file: 等可读标记
		if (asUtf8.includes('file:') || asUtf8.includes('untrusted comment')) {
			decoded = asUtf8
		}
	} catch {
		// 保持 raw
	}

	if (decoded.includes(`file:${artifactFileName}`)) return
	if (decoded.includes(artifactFileName)) return

	throw new Error(
		`签名文件与产物不匹配: ${path.basename(sigPath)} 未声明 file:${artifactFileName}` +
			`（已尝试 base64 解码检查）`,
	)
}

/** 构建前清空 bundle 输出，杜绝历史 NSIS/MSI/DMG 等残留被发布脚本误选 */
async function cleanBundleOutputs(bundleRoot: string) {
	console.log(chalk.gray('\n🧹 清理历史 bundle 产物...\n'))
	for (const dirName of BUNDLE_OUTPUT_DIRS) {
		const dir = path.join(bundleRoot, dirName)
		if (!existsSync(dir)) {
			console.log(chalk.gray(`   skip  ${dirName}/ (不存在)`))
			continue
		}
		await rm(dir, { recursive: true, force: true })
		console.log(chalk.green(`   clean ${dirName}/`))
	}
}

function isMutableReleasePointer(fileName: string) {
	return (
		fileName === 'latest.json' ||
		fileName === 'latest.meta.json' ||
		fileName.startsWith('latest.') ||
		fileName.startsWith('latest-')
	)
}

/**
 * 上传前一致性校验：
 * - latest.version === 发布版本
 * - 每个 platform URL 路径含版本目录，且 StoneFlow 文件名含版本
 * - url 对应的产物与 .sig 都在上传列表中
 * - 所有版本化二进制 key 落在 `/${version}/` 下
 */
function assertLatestJsonConsistency(
	latest: LatestJson,
	version: string,
	uploadItems: UploadItem[],
) {
	const errors: string[] = []
	const uploadByBaseName = new Map(uploadItems.map((item) => [path.basename(item.filePath), item]))

	if (latest.version !== version) {
		errors.push(`latest.json.version=${latest.version} 与发布版本 ${version} 不一致`)
	}

	if (Object.keys(latest.platforms).length === 0) {
		errors.push('latest.json.platforms 为空')
	}

	for (const [platformKey, meta] of Object.entries(latest.platforms)) {
		if (!meta.url?.trim()) {
			errors.push(`platform ${platformKey}: url 为空`)
			continue
		}
		if (!meta.signature?.trim()) {
			errors.push(`platform ${platformKey}: signature 为空`)
		}

		let parsedUrl: URL
		try {
			parsedUrl = new URL(meta.url)
		} catch {
			errors.push(`platform ${platformKey}: url 非法 ${meta.url}`)
			continue
		}

		const urlFileName = path.posix.basename(parsedUrl.pathname)
		const pathSegments = parsedUrl.pathname.split('/').filter(Boolean)

		if (!pathSegments.includes(version)) {
			errors.push(`platform ${platformKey}: url 路径未包含版本目录 ${version}: ${meta.url}`)
		}

		// 对外安装包统一使用含版本的文件名（含 mac 重命名后的 app.tar.gz）
		if (urlFileName.startsWith('StoneFlow') && !urlFileName.includes(version)) {
			errors.push(
				`platform ${platformKey}: 产物文件名未包含版本 ${version}: ${urlFileName}`,
			)
		}

		const artifactUpload = uploadByBaseName.get(urlFileName)
		if (!artifactUpload || !artifactUpload.key.includes(`/${version}/`)) {
			errors.push(
				`platform ${platformKey}: 上传列表中找不到版本目录下的 ${urlFileName}`,
			)
		}

		const sigUpload = uploadByBaseName.get(`${urlFileName}.sig`)
		if (!sigUpload || !sigUpload.key.includes(`/${version}/`)) {
			errors.push(
				`platform ${platformKey}: 上传列表中找不到版本目录下的 ${urlFileName}.sig`,
			)
		}
	}

	for (const item of uploadItems) {
		const base = path.basename(item.filePath)
		if (isMutableReleasePointer(base) || base.endsWith('.json')) continue

		const artifactName = base.endsWith('.sig') ? base.slice(0, -'.sig'.length) : base
		if (artifactName.startsWith('StoneFlow') && !artifactName.includes(version)) {
			errors.push(`待上传产物/签名文件名未含版本: ${base} (key=${item.key})`)
		}

		// 版本化二进制必须在 /{version}/ 下；latest-* 指针允许在渠道根目录
		if (!isMutableReleasePointer(base) && !item.key.includes(`/${version}/`)) {
			errors.push(`上传 key 未落在版本目录 ${version}: ${item.key}`)
		}
	}

	if (errors.length > 0) {
		throw new Error(
			`发布一致性校验失败（已阻止上传）:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
		)
	}
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

async function main() {
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

	// 3. 构建前清空历史产物，再构建
	await cleanBundleOutputs(TAURI_DIST)

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
				chalk.yellow(
					'   Windows beta 版本跳过 MSI，仅构建 NSIS（MSI 不支持 beta 预发布标识）',
				),
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

	// 4. 收集构建产物（版本精确匹配 + 签名配对）
	console.log(chalk.gray('\n🔍 收集构建产物...\n'))

	const platforms: Record<string, PlatformMeta> = {}
	const uploadItems: UploadItem[] = []

	async function addUpdaterArtifact(
		platformKey: string,
		filePath: string,
		sigPath: string,
		targetFileName = path.basename(filePath),
	) {
		// 最终对外文件名必须含版本，杜绝“目录新、文件旧”
		if (targetFileName.startsWith('StoneFlow') && !targetFileName.includes(VERSION)) {
			throw new Error(
				`updater 目标文件名未包含版本 ${VERSION}: ${targetFileName}（源 ${path.basename(filePath)}）`,
			)
		}

		await assertSignatureMentionsFile(sigPath, path.basename(filePath))

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
		await logArtifact(`${platformKey} updater`, targetPath)
		await logArtifact(`${platformKey} signature`, targetSigPath)
	}

	async function addDownloadArtifact(filePath: string, latestFileName: string) {
		const fileName = path.basename(filePath)
		if (fileName.startsWith('StoneFlow') && !fileName.includes(VERSION)) {
			throw new Error(`下载包文件名未包含版本 ${VERSION}: ${fileName}`)
		}

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
		await logArtifact(`下载包 ${latestFileName}`, targetPath)
	}

	// macOS updater 使用 .app.tar.gz；dmg 只给用户手动下载安装。
	// .app.tar.gz 源文件名可能不含版本，收集时重命名为带版本名。
	const macUpdaterCandidates = await listDirFiles(
		path.join(TAURI_DIST, 'macos'),
		(name) => name.endsWith('.app.tar.gz') && !name.endsWith('.app.tar.gz.sig'),
	)
	const macUpdaterFile = resolveUniqueArtifact(
		macUpdaterCandidates,
		VERSION,
		'macOS updater (.app.tar.gz)',
		false,
	)
	if (macUpdaterFile) {
		const macSig = await requireSignaturePair(macUpdaterFile)
		const arch = PLATFORM_KEY.replace('darwin-', '')
		await addUpdaterArtifact(
			PLATFORM_KEY,
			macUpdaterFile,
			macSig,
			`StoneFlow_${VERSION}_${arch}.app.tar.gz`,
		)
	}

	const dmgCandidates = await listDirFiles(path.join(TAURI_DIST, 'dmg'), (name) =>
		name.endsWith('.dmg'),
	)
	const dmgFile = resolveUniqueArtifact(dmgCandidates, VERSION, 'macOS DMG', true)
	if (dmgFile) {
		await addDownloadArtifact(dmgFile, 'latest.dmg')
	}

	// Linux AppImage（updater 用 .AppImage.tar.gz）
	const appimageCandidates = await listDirFiles(
		path.join(TAURI_DIST, 'appimage'),
		(name) => name.endsWith('.AppImage.tar.gz') && !name.endsWith('.sig'),
	)
	const appimageFile = resolveUniqueArtifact(
		appimageCandidates,
		VERSION,
		'Linux AppImage.tar.gz',
		true,
	)
	if (appimageFile) {
		const appimageSig = await requireSignaturePair(appimageFile)
		await addUpdaterArtifact(PLATFORM_KEY, appimageFile, appimageSig)
		await addDownloadArtifact(appimageFile, 'latest.AppImage.tar.gz')
	}

	// Windows：优先 NSIS；否则 MSI（stable）。两者文件名都必须含版本。
	const nsisCandidates = await listDirFiles(
		path.join(TAURI_DIST, 'nsis'),
		(name) => name.endsWith('.exe') && !name.endsWith('.sig'),
	)
	const nsisFile = resolveUniqueArtifact(nsisCandidates, VERSION, 'Windows NSIS', true)

	const msiCandidates = await listDirFiles(
		path.join(TAURI_DIST, 'msi'),
		(name) => name.endsWith('.msi') && !name.endsWith('.sig'),
	)
	const msiFile = resolveUniqueArtifact(msiCandidates, VERSION, 'Windows MSI', true)

	if (nsisFile) {
		const nsisSig = await requireSignaturePair(nsisFile)
		await addUpdaterArtifact(PLATFORM_KEY, nsisFile, nsisSig)
		await addDownloadArtifact(nsisFile, 'latest-setup.exe')
	} else if (msiFile) {
		const msiSig = await requireSignaturePair(msiFile)
		await addUpdaterArtifact(PLATFORM_KEY, msiFile, msiSig)
		await addDownloadArtifact(msiFile, 'latest.msi')
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

	// 6.5 上传前硬校验：版本 / URL / 文件名 / 上传列表一致
	console.log(chalk.gray('\n🔒 发布一致性校验...\n'))
	try {
		assertLatestJsonConsistency(latestJson, VERSION, uploadItems)
		console.log(chalk.green('   ✓ latest.json / 产物 / 上传列表一致'))
	} catch (error) {
		console.error(chalk.red(`\n❌ ${(error as Error).message}`))
		process.exit(1)
	}

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
		console.log(
			chalk.yellow('   你可以按 .release-tmp 下的 updates / downloads 目录手动上传到 R2'),
		)
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
				ContentType: fileName.endsWith('.json')
					? 'application/json'
					: 'application/octet-stream',
				CacheControl: isMutableFile ? 'no-cache' : 'public, max-age=31536000, immutable',
			}),
		)

		console.log(chalk.green(`   ✓ ${fileName}`))
	}

	// 9. 完成
	console.log(chalk.green('\n✅ 发布完成!'))
	console.log(
		chalk.gray(
			`\n   更新地址: ${R2_PUBLIC_URL}/updates/${CHANNEL}/${PLATFORM_KEY}/latest.json`,
		),
	)
	console.log(
		chalk.gray(`   下载目录: ${R2_PUBLIC_URL}/downloads/${CHANNEL}/${PLATFORM_KEY}/`),
	)
	console.log(chalk.gray(`   版本: ${VERSION}`))
	console.log(chalk.gray(`   平台: ${Object.keys(platforms).join(', ')}\n`))

	// 清理临时目录
	await rm(WORK_DIR, { recursive: true, force: true })
}

// 仅直接执行时跑发布流程；被 import 时不产生副作用
if (import.meta.main) {
	await main()
}
