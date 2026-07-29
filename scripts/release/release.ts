/**
 * StoneFlow 应用更新发布脚本
 *
 * 长期模型：一个 Git commit 对应一个 release version，平台只是该 release 的 artifact。
 *
 * 用法:
 *   bun run release
 *   bun run scripts/release/release.ts stable [--no-upload]
 *   bun run scripts/release/release.ts beta [--no-upload]
 *   bun run scripts/release/release.ts beta --version 0.1.2-beta.1
 */

import { $, argv } from 'bun'
import { existsSync } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

import { collectReleaseArtifacts } from './artifacts'
import { resetLocalReleaseOutputs } from './cleanup'
import { chalk, readJSON, writeJSON } from './io'
import { assertLatestJsonConsistency, createLatestJson, createReleaseManifest } from './manifest'
import { createReleasePaths, expandHomePath, resolvePlatformKey } from './paths'
import { resolveReleasePlan } from './release-plan'
import {
	assertR2Config,
	fetchJson,
	readRemoteLatestRelease,
	type ReleaseRemoteConfig,
	uploadItems,
} from './remote'
import type { LatestJson, ReleaseChannel, UploadItem } from './types'

const CHANGELOG_ENTRY_HEADING = /^## \[\d+\.\d+\.\d+(?:-beta\.\d+)?\] - \d{4}-\d{2}-\d{2}$/

export async function validateChangelog(filePath: string) {
	if (!existsSync(filePath)) {
		throw new Error('缺少根 CHANGELOG.md，发布已停止')
	}

	const content = await Bun.file(filePath).text()
	const versions = new Set<string>()
	for (const line of content.split('\n')) {
		if (!line.startsWith('## ')) continue
		if (!CHANGELOG_ENTRY_HEADING.test(line)) {
			throw new Error(`CHANGELOG.md 版本标题格式错误: ${line}`)
		}
		const version = line.slice(4, line.indexOf(']'))
		if (versions.has(version)) {
			throw new Error(`CHANGELOG.md 存在重复版本: ${version}`)
		}
		versions.add(version)
	}
}

export function createUploadList(input: {
	channel: ReleaseChannel
	version: string
	changelogPath: string
	artifactItems: UploadItem[]
	latestJsonPath: string
	latestReleasePath: string
	versionReleasePath: string
}): UploadItem[] {
	return [
		{ filePath: input.changelogPath, key: 'stoneflow/CHANGELOG.md' },
		...input.artifactItems,
		{
			filePath: input.latestReleasePath,
			key: `stoneflow/updates/${input.channel}/latest.release.json`,
		},
		{
			filePath: input.versionReleasePath,
			key: `stoneflow/updates/${input.channel}/releases/${input.version}/release.json`,
		},
		{
			filePath: input.latestJsonPath,
			key: `stoneflow/updates/${input.channel}/latest.json`,
		},
	]
}

function getArg(name: string): string | undefined {
	const idx = argv.indexOf(name)
	return idx >= 0 && idx + 1 < argv.length ? argv[idx + 1] : undefined
}

async function resolveGitCommit() {
	try {
		return (await $`git rev-parse --short=8 HEAD`.quiet().text()).trim()
	} catch {
		return 'unknown'
	}
}

async function buildApp(input: {
	channel: ReleaseChannel
	platformKey: string
	sourceVersion: string
	version: string
	tauriConfPath: string
	tauriConf: Record<string, unknown> & { version: string }
}) {
	console.log(chalk.gray('\n📦 构建应用...\n'))
	const tauriEnv = { ...process.env }
	const signingPrivateKey = expandHomePath(
		process.env.TAURI_SIGNING_PRIVATE_KEY ?? process.env.TAURI_SIGNING_PRIVATE_KEY_PATH,
	)
	if (signingPrivateKey) tauriEnv.TAURI_SIGNING_PRIVATE_KEY = signingPrivateKey
	if (process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
		tauriEnv.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD
	}

	$.env(tauriEnv)
	if (input.version !== input.sourceVersion) {
		await writeJSON(input.tauriConfPath, { ...input.tauriConf, version: input.version })
	}
	try {
		if (input.channel === 'beta' && input.platformKey.startsWith('windows-')) {
			console.log(
				chalk.yellow('   Windows beta 版本跳过 MSI，仅构建 NSIS（MSI 不支持 beta 预发布标识）'),
			)
			await $`bun run tauri build --bundles nsis`
		} else {
			await $`bun run tauri build`
		}
	} finally {
		if (input.version !== input.sourceVersion) {
			await writeJSON(input.tauriConfPath, input.tauriConf)
		}
	}
}

async function readRemoteLatestJson(
	config: ReleaseRemoteConfig,
	channel: ReleaseChannel,
	noUpload: boolean,
) {
	try {
		return await fetchJson<LatestJson>(`${config.publicUrl}/updates/${channel}/latest.json`)
	} catch (error) {
		if (!noUpload) throw error
		console.log(chalk.yellow('   无法读取全局 latest.json，--no-upload 将按空 manifest 处理'))
		return null
	}
}

async function main() {
	const channel = argv.find((arg): arg is ReleaseChannel => arg === 'stable' || arg === 'beta')
	if (!channel) {
		console.error(chalk.red('错误: 请指定渠道 (stable 或 beta)'))
		process.exit(1)
	}

	const noUpload = argv.includes('--no-upload')
	const platformKey = resolvePlatformKey()
	const paths = createReleasePaths({
		channel,
		platformKey,
		scriptDir: import.meta.dir,
	})
	const remoteConfig: ReleaseRemoteConfig = {
		publicUrl: process.env.R2_PUBLIC_URL || 'https://release.sty20030818.space/stoneflow',
		bucket: process.env.R2_BUCKET_NAME || '',
		endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	}

	console.log(chalk.blue(`\n🚀 开始发布 ${channel} 渠道更新...\n`))
	console.log(chalk.gray(`   发布平台: ${platformKey}`))

	await resetLocalReleaseOutputs(paths)
	await validateChangelog(paths.changelogPath)

	const tauriConf = await readJSON<Record<string, unknown> & { version: string }>(
		paths.tauriConfPath,
	)
	const sourceVersion = tauriConf.version
	const commit = await resolveGitCommit()
	const latestRelease = await readRemoteLatestRelease(remoteConfig, channel, noUpload)
	const latestJsonFromRemote = await readRemoteLatestJson(remoteConfig, channel, noUpload)
	const releasePlan = resolveReleasePlan({
		channel,
		sourceVersion,
		commit,
		latestRelease,
		specifiedVersion: getArg('--version'),
	})
	const version = releasePlan.version
	const pubDate = new Date().toISOString()
	const releaseVersionDir = path.join(paths.releaseRoot, version)
	const downloadsVersionDir = path.join(paths.downloadsRoot, version)

	console.log(chalk.gray(`   配置版本: ${sourceVersion}`))
	console.log(chalk.gray(`   发布版本: ${version}`))
	console.log(chalk.gray(`   Git 提交: ${commit}`))
	if (releasePlan.isExistingCommitRelease) {
		console.log(chalk.gray('   同 commit 发布，复用已有 release version'))
	}

	await buildApp({
		channel,
		platformKey,
		sourceVersion,
		version,
		tauriConfPath: paths.tauriConfPath,
		tauriConf,
	})

	console.log(chalk.gray('\n🔍 收集构建产物...\n'))
	const collected = await collectReleaseArtifacts({
		channel,
		platformKey,
		version,
		tauriDist: paths.tauriDist,
		releaseVersionDir,
		downloadsVersionDir,
		publicUrl: remoteConfig.publicUrl,
	})

	const latestJson = createLatestJson({
		version,
		pubDate,
		platforms: collected.platforms,
		previousLatest: latestJsonFromRemote,
	})
	const releaseManifest = createReleaseManifest({
		version,
		channel,
		commit,
		sourceVersion,
		pubDate,
		platformKey,
		latestRelease,
	})

	await mkdir(releaseVersionDir, { recursive: true })
	const changelogPath = path.join(paths.workDir, 'CHANGELOG.md')
	await copyFile(paths.changelogPath, changelogPath)
	const latestJsonPath = path.join(paths.workDir, 'updates', channel, 'latest.json')
	const latestReleasePath = path.join(paths.workDir, 'updates', channel, 'latest.release.json')
	const versionReleasePath = path.join(releaseVersionDir, 'release.json')

	await mkdir(path.dirname(latestJsonPath), { recursive: true })
	await writeJSON(latestJsonPath, latestJson)
	await writeJSON(latestReleasePath, releaseManifest)
	await writeJSON(versionReleasePath, releaseManifest)
	const uploadList = createUploadList({
		channel,
		version,
		changelogPath,
		artifactItems: collected.uploadItems,
		latestJsonPath,
		latestReleasePath,
		versionReleasePath,
	})
	console.log(chalk.gray('\n📝 生成全局 latest.json / release manifest'))

	console.log(chalk.gray('\n🔒 发布一致性校验...\n'))
	try {
		assertLatestJsonConsistency(latestJson, version, uploadList)
		console.log(chalk.green('   ✓ latest.json / 产物 / 上传列表一致'))
	} catch (error) {
		console.error(chalk.red(`\n❌ ${(error as Error).message}`))
		process.exit(1)
	}

	console.log(chalk.gray('\n────────────────────────────────────────'))
	console.log(chalk.cyan('更新清单预览:'))
	console.log(JSON.stringify(latestJson, null, 2))
	console.log(chalk.gray('────────────────────────────────────────\n'))

	if (noUpload) {
		console.log(chalk.yellow('⚠️  --no-upload 模式，跳过上传'))
		console.log(chalk.gray(`   构建产物已保存到: ${paths.workDir}`))
		process.exit(0)
	}

	try {
		assertR2Config(remoteConfig)
	} catch (error) {
		console.error(chalk.red(`\n❌ ${(error as Error).message}`))
		console.log(chalk.yellow('\n💡 提示: 构建产物已保存到:'), paths.workDir)
		console.log(chalk.yellow('   你可以按 .release-tmp 下的 updates / downloads 目录手动上传到 R2'))
		process.exit(1)
	}

	console.log(chalk.blue(`☁️  上传到 Cloudflare R2 (${remoteConfig.bucket})...\n`))
	await uploadItems(remoteConfig, uploadList)
	await resetLocalReleaseOutputs(paths)

	console.log(chalk.green('\n✅ 发布完成!'))
	console.log(chalk.gray(`\n   更新地址: ${remoteConfig.publicUrl}/updates/${channel}/latest.json`))
	console.log(
		chalk.gray(`   下载目录: ${remoteConfig.publicUrl}/downloads/${channel}/${platformKey}/`),
	)
	console.log(chalk.gray(`   版本: ${version}`))
	console.log(chalk.gray(`   平台: ${Object.keys(latestJson.platforms).join(', ')}\n`))
}

if (import.meta.main) {
	await main()
}
