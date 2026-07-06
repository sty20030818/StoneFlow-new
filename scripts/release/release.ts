/**
 * StoneFlow 应用更新发布脚本
 *
 * 用法:
 *   bun run scripts/release/release.ts stable [--no-upload]
 *   bun run scripts/release/release.ts beta [--no-upload]
 */

import { $, argv, chalk, fs, path } from 'bun'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// 配置
const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://release.sty20030818.space/stoneflow'
const R2_BUCKET = process.env.R2_BUCKET_NAME || ''
const CHANNEL = argv[0] as 'stable' | 'beta'
const NO_UPLOAD = argv.includes('--no-upload')

// Tauri 构建输出目录
const TAURI_DIST = path.resolve(import.meta.dir, '../../src-tauri/target/release/bundle')
// 临时工作目录
const WORK_DIR = path.resolve(import.meta.dir, '../../.release-tmp')

// 平台映射：Tauri bundle 目录名 -> updater platform key
const PLATFORM_MAP: Record<string, string> = {
	dmg: 'darwin-x86_64', // macOS Intel
	// 'dmg': 'darwin-aarch64', // macOS Apple Silicon (需要在对应架构构建)
	appimage: 'linux-x86_64',
	msi: 'windows-x86_64',
}

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

if (!CHANNEL || !['stable', 'beta'].includes(CHANNEL)) {
	console.error(chalk.red('错误: 请指定渠道 (stable 或 beta)'))
	process.exit(1)
}

// beta 渠道需要修改版本号添加 -beta 后缀吗？暂时不自动改，由开发者手动设置
console.log(chalk.blue(`\n🚀 开始发布 ${CHANNEL} 渠道更新...\n`))

// 1. 清理临时目录
await fs.emptyDir(WORK_DIR)

// 2. 读取当前版本
const tauriConf = await fs.readJSON(
	path.resolve(import.meta.dir, '../../src-tauri/tauri.conf.json'),
)
const VERSION = tauriConf.version
console.log(chalk.gray(`   版本: ${VERSION}`))

// 3. 构建 Tauri 应用
console.log(chalk.gray('\n📦 构建应用...\n'))
$.env({
	...process.env,
	TAURI_SIGNING_PRIVATE_KEY: process.env.TAURI_SIGNING_PRIVATE_KEY_PATH,
	TAURI_SIGNING_PRIVATE_KEY_PASSWORD: process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD,
})
await $`bun run tauri build`

// 4. 收集构建产物
console.log(chalk.gray('\n🔍 收集构建产物...\n'))

const platforms: Record<string, PlatformMeta> = {}

// 查找 macOS .dmg 及签名
const dmgFiles = await fs.glob(`${TAURI_DIST}/dmg/*.dmg`).all()
const dmgSigFiles = await fs.glob(`${TAURI_DIST}/dmg/*.dmg.sig`).all()

if (dmgFiles.length > 0 && dmgSigFiles.length > 0) {
	const dmgPath = dmgFiles[0]
	const sigPath = dmgSigFiles[0]
	const fileName = path.basename(dmgPath)
	const signature = await fs.readFile(sigPath, 'utf8')

	// 复制到工作目录
	await fs.copyFile(dmgPath, path.join(WORK_DIR, fileName))

	// 判断架构 (简单判断，实际应根据构建机器或更准确方式)
	const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64'
	const platformKey = `darwin-${arch}`
	platforms[platformKey] = {
		url: `${R2_PUBLIC_URL}/updates/${CHANNEL}/${fileName}`,
		signature: signature.trim(),
	}
	console.log(chalk.green(`   ✓ ${platformKey}: ${fileName}`))
}

// 查找 Linux AppImage 及签名
const appimageFiles = await fs.glob(`${TAURI_DIST}/appimage/*.AppImage.tar.gz`).all()
const appimageSigFiles = await fs.glob(`${TAURI_DIST}/appimage/*.AppImage.tar.gz.sig`).all()

if (appimageFiles.length > 0 && appimageSigFiles.length > 0) {
	const filePath = appimageFiles[0]
	const sigPath = appimageSigFiles[0]
	const fileName = path.basename(filePath)
	const signature = await fs.readFile(sigPath, 'utf8')

	await fs.copyFile(filePath, path.join(WORK_DIR, fileName))

	platforms['linux-x86_64'] = {
		url: `${R2_PUBLIC_URL}/updates/${CHANNEL}/${fileName}`,
		signature: signature.trim(),
	}
	console.log(chalk.green(`   ✓ linux-x86_64: ${fileName}`))
}

// 查找 Windows MSI 及签名
const msiFiles = await fs.glob(`${TAURI_DIST}/msi/*.msi.zip`).all()
const msiSigFiles = await fs.glob(`${TAURI_DIST}/msi/*.msi.zip.sig`).all()

if (msiFiles.length > 0 && msiSigFiles.length > 0) {
	const filePath = msiFiles[0]
	const sigPath = msiSigFiles[0]
	const fileName = path.basename(filePath)
	const signature = await fs.readFile(sigPath, 'utf8')

	await fs.copyFile(filePath, path.join(WORK_DIR, fileName))

	platforms['windows-x86_64'] = {
		url: `${R2_PUBLIC_URL}/updates/${CHANNEL}/${fileName}`,
		signature: signature.trim(),
	}
	console.log(chalk.green(`   ✓ windows-x86_64: ${fileName}`))
}

if (Object.keys(platforms).length === 0) {
	console.error(chalk.red('\n❌ 错误: 未找到任何构建产物，请检查构建是否成功'))
	process.exit(1)
}

// 5. 读取更新说明（如果存在 RELEASE_NOTES.md）
const notesPath = path.resolve(import.meta.dir, '../../RELEASE_NOTES.md')
let notes = ''
if (await fs.exists(notesPath)) {
	notes = await fs.readFile(notesPath, 'utf8')
}

// 6. 生成 latest.json
const latestJson: LatestJson = {
	version: VERSION,
	notes,
	pub_date: new Date().toISOString(),
	platforms,
}

const latestJsonPath = path.join(WORK_DIR, 'latest.json')
await fs.writeJSON(latestJsonPath, latestJson, { spaces: 2 })
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
	console.log(chalk.yellow('   你可以手动上传到 R2 的 stoneflow/updates/' + CHANNEL + '/ 目录下'))
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

// 上传所有文件
const filesToUpload = await fs.glob(`${WORK_DIR}/*`).all()
const uploadPath = `stoneflow/updates/${CHANNEL}`

for (const file of filesToUpload) {
	const fileName = path.basename(file)
	const key = `${uploadPath}/${fileName}`
	const body = await fs.readFile(file)

	console.log(chalk.gray(`   上传 ${key}...`))

	await s3Client.send(
		new PutObjectCommand({
			Bucket: R2_BUCKET,
			Key: key,
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
console.log(chalk.gray(`   版本: ${VERSION}`))
console.log(chalk.gray(`   平台: ${Object.keys(platforms).join(', ')}\n`))

// 清理临时目录
await fs.remove(WORK_DIR)
