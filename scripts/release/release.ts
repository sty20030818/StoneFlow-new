/** StoneFlow 跨平台发布入口；真实发布会写 Git remote 与 R2。 */

import { argv } from 'bun'
import path from 'node:path'

import { collectReleaseArtifacts } from './artifacts'
import { buildReleaseApp } from './build'
import {
	inspectChangelogCompatibility,
	publishChangelog,
	validatePublishedChangelog,
} from './changelog-publish'
import { cleanupReleaseRun, combineReleaseFailure } from './cleanup'
import { claimRelease } from './git'
import { chalk } from './io'
import { createLatestJson, createPlatformReleaseRecord } from './manifest'
import { createReleasePaths, platformLatestJsonUrl, resolvePlatformKey } from './paths'
import {
	advancePlatformPointer,
	publishArtifactsAndRecord,
	readPublishedPlatformRecord,
} from './platform-release'
import { revalidateReleasePreflight, runReleasePreflight } from './preflight'
import { assertR2Config, createS3Client, type ReleaseRemoteConfig } from './remote'
import type {
	ImmutableArtifactUpload,
	PlatformReleaseRecord,
	ReleaseChannel,
	ReleasePlan,
} from './types'
import { withReleaseBuildWorkspace } from './workspace'

export interface PreparedPlatformRelease {
	readonly record: PlatformReleaseRecord
	readonly uploadItems: readonly ImmutableArtifactUpload[]
}

export interface ReleaseWorkflowSteps<T> {
	readonly inspectPlatformRecord: () => Promise<T | null>
	readonly buildAndCollect: () => Promise<T>
	readonly revalidate: () => Promise<ReleasePlan>
	readonly inspectChangelogCompatibility: (plan: ReleasePlan) => Promise<void>
	readonly claim: (plan: ReleasePlan) => Promise<void>
	readonly publishArtifactsAndRecord: (prepared: T) => Promise<void>
	readonly publishChangelog: (plan: ReleasePlan) => Promise<void>
	readonly validatePublishedChangelog: () => Promise<void>
	readonly advancePlatformPointer: (prepared: T) => Promise<void>
}

export async function runReleaseWorkflow<T>(
	input: { readonly noUpload: boolean; readonly plan: ReleasePlan },
	steps: ReleaseWorkflowSteps<T>,
) {
	if (input.noUpload) {
		return { prepared: await steps.buildAndCollect(), built: true, published: false } as const
	}

	const existing = await steps.inspectPlatformRecord()
	if (existing && input.plan.kind !== 'reuse') {
		throw new Error('尚未建立发布 Tag，但远端已存在同版本 platform record')
	}
	const built = existing === null
	const prepared = existing ?? (await steps.buildAndCollect())
	const currentPlan = await steps.revalidate()
	await steps.inspectChangelogCompatibility(currentPlan)
	await steps.claim(currentPlan)
	if (built) await steps.publishArtifactsAndRecord(prepared)
	await steps.publishChangelog(currentPlan)
	await steps.validatePublishedChangelog()
	await steps.advancePlatformPointer(prepared)
	return { prepared, built, published: true } as const
}

export function parseReleaseArguments(args: readonly string[]) {
	const allowed = new Set(['stable', 'beta', '--no-upload'])
	const unknown = args.find((arg) => !allowed.has(arg))
	if (unknown) throw new Error(`未知发布参数：${unknown}`)
	const channels = args.filter(
		(argument): argument is ReleaseChannel => argument === 'stable' || argument === 'beta',
	)
	if (channels.length !== 1) throw new Error('请且仅指定一个发布渠道：stable 或 beta')
	if (args.filter((argument) => argument === '--no-upload').length > 1) {
		throw new Error('--no-upload 不得重复')
	}
	return { channel: channels[0]!, noUpload: args.includes('--no-upload') }
}

function createRemoteConfig(env: NodeJS.ProcessEnv): ReleaseRemoteConfig {
	return {
		publicUrl: env.R2_PUBLIC_URL || 'https://release.sty20030818.space/stoneflow',
		bucket: env.R2_BUCKET_NAME || '',
		endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	}
}

export async function runReleaseCommand(args: readonly string[] = argv.slice(2)) {
	const env = process.env
	const { channel, noUpload } = parseReleaseArguments(args)
	const platformKey = resolvePlatformKey()
	const paths = createReleasePaths({ channel, platformKey, scriptDir: import.meta.dir })
	const remoteConfig = createRemoteConfig(env)

	try {
		console.log(chalk.blue(`\n🚀 开始发布 ${channel} 渠道更新...\n`))
		console.log(chalk.gray(`   发布平台: ${platformKey}`))
		const preflight = await runReleasePreflight({ repoRoot: paths.repoRoot, channel })
		const { sourceVersion, releaseCommit: commit, plan } = preflight
		const { version } = plan
		console.log(chalk.gray(`   配置版本: ${sourceVersion}`))
		console.log(chalk.gray(`   发布版本: ${version}`))
		console.log(chalk.gray(`   Git 提交: ${commit}`))

		let client: ReturnType<typeof createS3Client> | null = null
		if (!noUpload) {
			assertR2Config(remoteConfig)
			client = createS3Client(remoteConfig)
		}

		const requireClient = () => {
			if (!client) throw new Error('--no-upload 模式不得访问 R2')
			return client
		}
		const result = await withReleaseBuildWorkspace(
			{ ...paths, releaseCommit: commit },
			async (workspace) => {
				const buildAndCollect = async (): Promise<PreparedPlatformRelease> => {
					console.log(chalk.gray('\n📦 从固定 commit 快照构建应用...\n'))
					await buildReleaseApp({
						channel,
						platformKey,
						version,
						sourceRoot: workspace.sourceRoot,
						targetDir: workspace.targetDir,
						env,
					})
					console.log(chalk.gray('\n🔍 收集构建产物...\n'))
					const collected = await collectReleaseArtifacts({
						channel,
						platformKey,
						version,
						tauriDist: paths.tauriDist,
						releaseVersionDir: path.join(paths.releaseRoot, version),
						downloadsVersionDir: path.join(paths.downloadsRoot, version),
						publicUrl: remoteConfig.publicUrl,
						updaterPublicKey: preflight.updaterPublicKey,
						repoRoot: workspace.sourceRoot,
					})
					return {
						record: createPlatformReleaseRecord({
							channel,
							version,
							commit,
							sourceVersion,
							platform: platformKey,
							updater: collected.updater,
							downloads: collected.downloads,
						}),
						uploadItems: collected.uploadItems,
					}
				}

				return runReleaseWorkflow(
					{ noUpload, plan },
					{
						inspectPlatformRecord: async () => {
							const record = await readPublishedPlatformRecord({
								client: requireClient(),
								config: remoteConfig,
								channel,
								version,
								commit,
								sourceVersion,
								platformKey,
								updaterPublicKey: preflight.updaterPublicKey,
								verifierRepoRoot: workspace.sourceRoot,
							})
							return record ? { record, uploadItems: [] } : null
						},
						buildAndCollect,
						revalidate: () => revalidateReleasePreflight(preflight),
						inspectChangelogCompatibility: (currentPlan) =>
							inspectChangelogCompatibility({
								client: requireClient(),
								config: remoteConfig,
								source: preflight.changelogSource,
								targetVersion: currentPlan.version,
								releaseKind: currentPlan.kind,
							}),
						claim: async (currentPlan) => {
							await claimRelease({
								cwd: paths.repoRoot,
								remoteEndpoint: preflight.remoteEndpoint,
								channel,
								plan: currentPlan,
							})
						},
						publishArtifactsAndRecord: (prepared) =>
							publishArtifactsAndRecord({
								client: requireClient(),
								config: remoteConfig,
								uploadItems: prepared.uploadItems,
								record: prepared.record,
							}),
						publishChangelog: (currentPlan) =>
							publishChangelog({
								client: requireClient(),
								config: remoteConfig,
								source: preflight.changelogSource,
								targetVersion: version,
								releaseKind: currentPlan.kind,
							}),
						validatePublishedChangelog: () =>
							validatePublishedChangelog({
								client: requireClient(),
								config: remoteConfig,
								targetVersion: version,
							}),
						advancePlatformPointer: (prepared) =>
							advancePlatformPointer({
								client: requireClient(),
								config: remoteConfig,
								channel,
								platformKey,
								pointer: createLatestJson({
									version,
									platformKey,
									updater: prepared.record.updater,
								}),
							}),
					},
				)
			},
		)

		const pointer = createLatestJson({
			version,
			platformKey,
			updater: result.prepared.record.updater,
		})
		console.log(chalk.gray('\n────────────────────────────────────────'))
		console.log(chalk.cyan('本平台更新清单预览:'))
		console.log(JSON.stringify(pointer, null, 2))
		console.log(chalk.gray('────────────────────────────────────────\n'))
		if (!result.published) {
			console.log(chalk.yellow('⚠️  --no-upload 模式：未创建 Tag/ledger，未访问 R2'))
			console.log(chalk.gray(`   暂存产物已保存到: ${paths.stagingDir}`))
			return result
		}

		console.log(chalk.green('\n✅ 发布完成!'))
		try {
			await cleanupReleaseRun(paths)
		} catch (error) {
			console.warn(
				chalk.yellow(`⚠️  发布已公开，但本地临时目录清理失败：${(error as Error).message}`),
			)
		}
		console.log(
			chalk.gray(
				`   本平台更新地址: ${platformLatestJsonUrl(remoteConfig.publicUrl, channel, platformKey)}`,
			),
		)
		console.log(chalk.gray(`   版本: ${version}`))
		console.log(chalk.gray(`   平台: ${platformKey}\n`))
		return result
	} catch (error) {
		try {
			await cleanupReleaseRun(paths)
		} catch (cleanupError) {
			throw combineReleaseFailure(error, cleanupError)
		}
		throw error
	}
}

if (import.meta.main) {
	try {
		await runReleaseCommand()
	} catch (error) {
		console.error(chalk.red(`\n❌ ${(error as Error).message}`))
		process.exitCode = 1
	}
}
