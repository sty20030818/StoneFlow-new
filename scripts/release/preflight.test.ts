import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'bun:test'

import { revalidateReleasePreflight, runReleasePreflight } from './preflight'
import { RELEASE_TAG_SCHEMA } from './types'

const BASE_CHANGELOG = `# Changelog

## [未发布]

## [0.1.2] - 2026-08-05

### 修复

- Baseline release.
`

const CURRENT_CHANGELOG = `# Changelog

## [未发布]

## [0.1.3] - 2026-08-06

### 新增

- Candidate release.

## [0.1.2] - 2026-08-05

### 修复

- Baseline release.
`

const RETRACTED_CHANGELOG = CURRENT_CHANGELOG.replace(
	'## [0.1.3] - 2026-08-06',
	'## [0.1.3] - 2026-08-06 [已撤回]',
)

const BETA_HISTORY_CHANGELOG = `# Changelog

## [未发布]

## [0.1.3-beta.1] - 2026-08-06

### 新增

- Earlier Beta release.

## [0.1.2] - 2026-08-05

### 修复

- Baseline release.
`

const STABLE_BASELINE_CHANGELOG = `# Changelog

## [未发布]

## [0.1.3] - 2026-08-07

### 变更

- New Stable baseline.

## [0.1.3-beta.1] - 2026-08-06

### 新增

- Earlier Beta release.

## [0.1.2] - 2026-08-05

### 修复

- Baseline release.
`

const NEXT_BETA_CHANGELOG = `# Changelog

## [未发布]

## [0.1.4-beta.1] - 2026-08-08

### 新增

- Beta based on Stable 0.1.3.

## [0.1.3] - 2026-08-07

### 变更

- New Stable baseline.

## [0.1.3-beta.1] - 2026-08-06

### 新增

- Earlier Beta release.

## [0.1.2] - 2026-08-05

### 修复

- Baseline release.
`

interface GitFixture {
	readonly root: string
	readonly remote: string
	readonly publisher: string
	readonly rival: string
	readonly globalConfig: string
	readonly baseCommit: string
	readonly candidateCommit: string
}

interface GitResult {
	readonly exitCode: number
	readonly stdout: string
	readonly stderr: string
}

async function runGitResult(
	cwd: string,
	globalConfig: string,
	args: readonly string[],
): Promise<GitResult> {
	const child = Bun.spawn(['git', '-C', cwd, ...args], {
		env: {
			...process.env,
			GIT_CONFIG_GLOBAL: globalConfig,
			GIT_CONFIG_NOSYSTEM: '1',
			GIT_TERMINAL_PROMPT: '0',
			LANG: 'C',
			LC_ALL: 'C',
		},
		stdout: 'pipe',
		stderr: 'pipe',
	})
	const [exitCode, stdout, stderr] = await Promise.all([
		child.exited,
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	])
	return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() }
}

async function runGit(cwd: string, globalConfig: string, args: readonly string[]) {
	const result = await runGitResult(cwd, globalConfig, args)
	if (result.exitCode !== 0) {
		throw new Error(`git ${args.join(' ')} failed (${result.exitCode}): ${result.stderr}`)
	}
	return result.stdout
}

async function configureClone(cwd: string, globalConfig: string, identity: string) {
	await runGit(cwd, globalConfig, ['config', 'user.name', `StoneFlow Test ${identity}`])
	await runGit(cwd, globalConfig, [
		'config',
		'user.email',
		`${identity.toLowerCase()}@stoneflow.test`,
	])
	await runGit(cwd, globalConfig, ['config', 'commit.gpgSign', 'false'])
	await runGit(cwd, globalConfig, ['config', 'tag.gpgSign', 'false'])
}

async function writeJson(filePath: string, value: unknown) {
	await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

async function writeVersionFiles(repoRoot: string, packageVersion: string, tauriVersion: string) {
	await mkdir(path.join(repoRoot, 'src-tauri'), { recursive: true })
	await writeJson(path.join(repoRoot, 'package.json'), {
		name: 'stoneflow-release-fixture',
		private: true,
		version: packageVersion,
	})
	await writeJson(path.join(repoRoot, 'src-tauri', 'tauri.conf.json'), {
		productName: 'StoneFlow',
		version: tauriVersion,
		plugins: { updater: { pubkey: 'fixture-updater-public-key' } },
	})
}

async function commitAll(fixture: Pick<GitFixture, 'globalConfig'>, cwd: string, message: string) {
	await runGit(cwd, fixture.globalConfig, ['add', '--all'])
	await runGit(cwd, fixture.globalConfig, ['commit', '--message', message])
	return runGit(cwd, fixture.globalConfig, ['rev-parse', 'HEAD'])
}

async function createAnnotatedTag(
	fixture: Pick<GitFixture, 'globalConfig'>,
	cwd: string,
	name: string,
	commit: string,
) {
	await runGit(cwd, fixture.globalConfig, [
		'tag',
		'--annotate',
		'--no-sign',
		'--message',
		`StoneFlow ${name}\n\nstoneflow-release-schema: ${RELEASE_TAG_SCHEMA}`,
		name,
		commit,
	])
}

async function pushMain(fixture: GitFixture, cwd = fixture.publisher) {
	await runGit(cwd, fixture.globalConfig, ['push', 'origin', 'HEAD:refs/heads/main'])
}

async function createFixture(options: { publishCandidate?: boolean } = {}): Promise<GitFixture> {
	const root = await mkdtemp(path.join(tmpdir(), 'stoneflow-release-preflight-'))
	const remote = path.join(root, 'remote.git')
	const publisher = path.join(root, 'publisher')
	const rival = path.join(root, 'rival')
	const globalConfig = path.join(root, 'empty.gitconfig')
	await writeFile(globalConfig, '')

	await runGit(root, globalConfig, ['init', '--bare', remote])
	await runGit(remote, globalConfig, ['config', 'receive.denyDeletes', 'true'])
	await runGit(remote, globalConfig, ['config', 'receive.denyNonFastForwards', 'true'])
	await runGit(root, globalConfig, ['clone', remote, publisher])
	await configureClone(publisher, globalConfig, 'Publisher')
	await writeVersionFiles(publisher, '0.1.2', '0.1.2')
	await writeFile(path.join(publisher, 'CHANGELOG.md'), BASE_CHANGELOG)
	await writeFile(path.join(publisher, 'README.md'), 'fixture\n')
	const partialFixture = { globalConfig }
	const baseCommit = await commitAll(partialFixture, publisher, 'baseline')
	await runGit(publisher, globalConfig, ['branch', '--move', 'main'])
	await createAnnotatedTag(partialFixture, publisher, 'v0.1.2', baseCommit)
	await runGit(publisher, globalConfig, [
		'push',
		'--atomic',
		'origin',
		'refs/heads/main:refs/heads/main',
		'refs/tags/v0.1.2:refs/tags/v0.1.2',
		`${baseCommit}:refs/heads/release-ledger/stable`,
	])
	await runGit(remote, globalConfig, ['symbolic-ref', 'HEAD', 'refs/heads/main'])

	await writeVersionFiles(publisher, '0.1.3', '0.1.3')
	await writeFile(path.join(publisher, 'CHANGELOG.md'), CURRENT_CHANGELOG)
	const candidateCommit = await commitAll(partialFixture, publisher, 'candidate')
	if (options.publishCandidate !== false) {
		await runGit(publisher, globalConfig, ['push', 'origin', 'HEAD:refs/heads/main'])
	}

	await runGit(root, globalConfig, ['clone', remote, rival])
	await configureClone(rival, globalConfig, 'Rival')
	return { root, remote, publisher, rival, globalConfig, baseCommit, candidateCommit }
}

function restoreEnv(name: string, value: string | undefined) {
	if (value === undefined) delete process.env[name]
	else process.env[name] = value
}

async function withFixture(
	run: (fixture: GitFixture) => Promise<void>,
	options?: { publishCandidate?: boolean },
) {
	const fixture = await createFixture(options)
	const previousGlobalConfig = process.env.GIT_CONFIG_GLOBAL
	const previousNoSystem = process.env.GIT_CONFIG_NOSYSTEM
	process.env.GIT_CONFIG_GLOBAL = fixture.globalConfig
	process.env.GIT_CONFIG_NOSYSTEM = '1'
	try {
		await run(fixture)
	} finally {
		restoreEnv('GIT_CONFIG_GLOBAL', previousGlobalConfig)
		restoreEnv('GIT_CONFIG_NOSYSTEM', previousNoSystem)
		await rm(fixture.root, { recursive: true, force: true })
	}
}

describe('release preflight', () => {
	test('有效 Stable checkout 生成固定 commit 与 ledger lease 的 claim', async () => {
		await withFixture(async (fixture) => {
			const snapshot = await runReleasePreflight({
				repoRoot: fixture.publisher,
				channel: 'stable',
			})
			expect(snapshot.remoteName).toBe('origin')
			expect(snapshot.remoteEndpoint).toBe(fixture.remote)

			expect(await revalidateReleasePreflight(snapshot)).toEqual({
				kind: 'claim',
				version: '0.1.3',
				tagName: 'v0.1.3',
				commit: fixture.candidateCommit,
				expectedLedgerCommit: fixture.baseCommit,
			})
		})
	})

	test('tracked dirty 与 untracked 文件都会在构建前阻断', async () => {
		await withFixture(async (fixture) => {
			await writeFile(path.join(fixture.publisher, 'README.md'), 'dirty\n')
			await expect(
				runReleasePreflight({ repoRoot: fixture.publisher, channel: 'stable' }),
			).rejects.toThrow()

			await writeFile(path.join(fixture.publisher, 'README.md'), 'fixture\n')
			await writeFile(path.join(fixture.publisher, 'untracked.txt'), 'untracked\n')
			await expect(
				runReleasePreflight({ repoRoot: fixture.publisher, channel: 'stable' }),
			).rejects.toThrow()
		})
	})

	test('发布元数据只读取 release commit 原始 blob', async () => {
		await withFixture(async (fixture) => {
			const attributes = path.join(fixture.publisher, '.gitattributes')
			const smudge = path.join(fixture.root, 'smudge-release-inputs')
			const clean = path.join(fixture.root, 'clean-release-inputs')
			await writeFile(attributes, 'package.json filter=swap\nCHANGELOG.md filter=swap\n')
			await commitAll(fixture, fixture.publisher, 'tracked release input filter')
			await pushMain(fixture)
			await writeFile(
				smudge,
				"#!/bin/sh\nsed 's/0\\.1\\.3/0.1.4/g; s/fixture-updater-public-key/injected-updater-public-key/g'\n",
			)
			await writeFile(
				clean,
				"#!/bin/sh\nsed 's/0\\.1\\.4/0.1.3/g; s/injected-updater-public-key/fixture-updater-public-key/g'\n",
			)
			await chmod(smudge, 0o755)
			await chmod(clean, 0o755)
			await runGit(fixture.publisher, fixture.globalConfig, [
				'config',
				'filter.swap.smudge',
				smudge,
			])
			await runGit(fixture.publisher, fixture.globalConfig, ['config', 'filter.swap.clean', clean])
			for (const file of ['package.json', 'CHANGELOG.md']) {
				const filePath = path.join(fixture.publisher, file)
				const source = await readFile(filePath, 'utf8')
				await writeFile(
					filePath,
					source
						.replaceAll('0.1.3', '0.1.4')
						.replaceAll('fixture-updater-public-key', 'injected-updater-public-key'),
				)
			}
			expect(await readFile(path.join(fixture.publisher, 'package.json'), 'utf8')).toContain(
				'0.1.4',
			)
			expect(await runGit(fixture.publisher, fixture.globalConfig, ['status', '--porcelain'])).toBe(
				'',
			)

			const snapshot = await runReleasePreflight({
				repoRoot: fixture.publisher,
				channel: 'stable',
			})
			expect(snapshot.sourceVersion).toBe('0.1.3')
			expect(snapshot.plan.version).toBe('0.1.3')
			expect(snapshot.updaterPublicKey).toBe('fixture-updater-public-key')
			expect(snapshot.changelogSource).toBe(CURRENT_CHANGELOG)
		})
	})

	test('发布元数据包含非法 UTF-8 字节时拒绝认领', async () => {
		await withFixture(async (fixture) => {
			await writeFile(
				path.join(fixture.publisher, 'CHANGELOG.md'),
				Buffer.concat([Buffer.from(CURRENT_CHANGELOG), Buffer.from([0xff])]),
			)
			await commitAll(fixture, fixture.publisher, 'invalid utf8 changelog')
			await pushMain(fixture)

			await expect(
				runReleasePreflight({ repoRoot: fixture.publisher, channel: 'stable' }),
			).rejects.toThrow('不是合法 UTF-8')
		})
	})

	test.each([
		{
			name: 'assume-unchanged package.json',
			flag: '--assume-unchanged',
			file: 'package.json',
			write: (repoRoot: string) =>
				writeJson(path.join(repoRoot, 'package.json'), {
					name: 'stoneflow-release-fixture',
					private: true,
					version: '0.1.3',
					description: 'hidden drift',
				}),
		},
		{
			name: 'assume-unchanged 普通源码',
			flag: '--assume-unchanged',
			file: 'README.md',
			write: (repoRoot: string) => writeFile(path.join(repoRoot, 'README.md'), 'hidden drift\n'),
		},
		{
			name: 'skip-worktree CHANGELOG.md',
			flag: '--skip-worktree',
			file: 'CHANGELOG.md',
			write: (repoRoot: string) =>
				writeFile(
					path.join(repoRoot, 'CHANGELOG.md'),
					CURRENT_CHANGELOG.replace('Candidate release.', 'Hidden changelog drift.'),
				),
		},
	])('Git index 隐藏的 $name 仍属于未提交修改', async ({ flag, file, write }) => {
		await withFixture(async (fixture) => {
			await runGit(fixture.publisher, fixture.globalConfig, ['update-index', flag, '--', file])
			await write(fixture.publisher)

			await expect(
				runReleasePreflight({ repoRoot: fixture.publisher, channel: 'stable' }),
			).rejects.toThrow()
		})
	})

	test('package 与 Tauri 版本不一致或不是严格 Stable SemVer 时阻断', async () => {
		await withFixture(async (fixture) => {
			await writeVersionFiles(fixture.publisher, '0.1.3', '0.1.4')
			await commitAll(fixture, fixture.publisher, 'mismatched versions')
			await pushMain(fixture)
			await expect(
				runReleasePreflight({ repoRoot: fixture.publisher, channel: 'stable' }),
			).rejects.toThrow()

			await writeVersionFiles(fixture.publisher, '01.2.3', '01.2.3')
			await commitAll(fixture, fixture.publisher, 'invalid versions')
			await pushMain(fixture)
			await expect(
				runReleasePreflight({ repoRoot: fixture.publisher, channel: 'stable' }),
			).rejects.toThrow()
		})
	})

	test('目标 Changelog 条目缺失或已撤回时阻断', async () => {
		await withFixture(async (fixture) => {
			await writeFile(path.join(fixture.publisher, 'CHANGELOG.md'), BASE_CHANGELOG)
			await commitAll(fixture, fixture.publisher, 'missing changelog target')
			await pushMain(fixture)
			await expect(
				runReleasePreflight({ repoRoot: fixture.publisher, channel: 'stable' }),
			).rejects.toThrow('不存在')

			await writeFile(path.join(fixture.publisher, 'CHANGELOG.md'), RETRACTED_CHANGELOG)
			await commitAll(fixture, fixture.publisher, 'yanked changelog target')
			await pushMain(fixture)
			await expect(
				runReleasePreflight({ repoRoot: fixture.publisher, channel: 'stable' }),
			).rejects.toThrow('已撤回')
		})
	})

	test('新版本认领前必须保留全部 schema-1 Tag 对应的 Changelog 历史', async () => {
		await withFixture(async (fixture) => {
			await createAnnotatedTag(fixture, fixture.publisher, 'v0.1.3', fixture.candidateCommit)
			await runGit(fixture.publisher, fixture.globalConfig, [
				'push',
				'--atomic',
				'origin',
				'refs/tags/v0.1.3:refs/tags/v0.1.3',
				`${fixture.candidateCommit}:refs/heads/release-ledger/stable`,
			])
			await writeVersionFiles(fixture.publisher, '0.1.4', '0.1.4')
			await writeFile(
				path.join(fixture.publisher, 'CHANGELOG.md'),
				CURRENT_CHANGELOG.replace('0.1.3', '0.1.4'),
			)
			await commitAll(fixture, fixture.publisher, 'successor missing claimed history')
			await pushMain(fixture)

			await expect(
				runReleasePreflight({ repoRoot: fixture.publisher, channel: 'stable' }),
			).rejects.toThrow('缺少已认领版本 0.1.3')
		})
	})

	test('新 HEAD 不可从 remote 公共分支到达时阻断', async () => {
		await withFixture(async (fixture) => {
			await writeFile(path.join(fixture.publisher, 'local-only.txt'), 'local only\n')
			await commitAll(fixture, fixture.publisher, 'local only')

			await expect(
				runReleasePreflight({ repoRoot: fixture.publisher, channel: 'stable' }),
			).rejects.toThrow()
		})
	})

	test('fetch URL 与 push endpoint 不同时只以唯一 push endpoint 为发布真源', async () => {
		await withFixture(async (fixture) => {
			const pushRemote = path.join(fixture.root, 'push-remote.git')
			await runGit(fixture.root, fixture.globalConfig, ['init', '--bare', pushRemote])
			await runGit(fixture.publisher, fixture.globalConfig, [
				'config',
				'remote.origin.pushurl',
				pushRemote,
			])

			await expect(
				runReleasePreflight({ repoRoot: fixture.publisher, channel: 'stable' }),
			).rejects.toThrow()
		})
	})

	test('快照建立后 push endpoint 漂移时拒绝构建结果', async () => {
		await withFixture(async (fixture) => {
			const snapshot = await runReleasePreflight({
				repoRoot: fixture.publisher,
				channel: 'stable',
			})
			const driftRemote = path.join(fixture.root, 'drift-remote.git')
			await runGit(fixture.root, fixture.globalConfig, ['init', '--bare', driftRemote])
			await runGit(fixture.publisher, fixture.globalConfig, [
				'config',
				'remote.origin.pushurl',
				driftRemote,
			])

			await expect(revalidateReleasePreflight(snapshot)).rejects.toThrow('push endpoint')
		})
	})

	test('任一较早同渠道 Tag 不在 ledger history 时阻断', async () => {
		await withFixture(async (fixture) => {
			const tree = await runGit(fixture.publisher, fixture.globalConfig, [
				'rev-parse',
				`${fixture.baseCommit}^{tree}`,
			])
			const forkCommit = await runGit(fixture.publisher, fixture.globalConfig, [
				'commit-tree',
				tree,
				'-m',
				'historical fork',
			])
			await createAnnotatedTag(fixture, fixture.publisher, 'v0.1.1', forkCommit)
			await runGit(fixture.publisher, fixture.globalConfig, [
				'push',
				'origin',
				'refs/tags/v0.1.1:refs/tags/v0.1.1',
			])

			await expect(
				runReleasePreflight({ repoRoot: fixture.publisher, channel: 'stable' }),
			).rejects.toThrow()
		})
	})

	test('Beta 切换新 Stable 基线时拒绝分叉候选，接受包含基线的后继', async () => {
		await withFixture(async (fixture) => {
			await runGit(fixture.publisher, fixture.globalConfig, [
				'switch',
				'--detach',
				fixture.baseCommit,
			])
			await writeFile(path.join(fixture.publisher, 'CHANGELOG.md'), BETA_HISTORY_CHANGELOG)
			const previousBetaCommit = await commitAll(fixture, fixture.publisher, 'previous beta')
			await createAnnotatedTag(fixture, fixture.publisher, 'v0.1.3-beta.1', previousBetaCommit)
			await runGit(fixture.publisher, fixture.globalConfig, [
				'push',
				'--atomic',
				'origin',
				'refs/tags/v0.1.3-beta.1:refs/tags/v0.1.3-beta.1',
				`${previousBetaCommit}:refs/heads/release-ledger/beta`,
				`${previousBetaCommit}:refs/heads/beta-history`,
			])

			await writeVersionFiles(fixture.publisher, '0.1.3', '0.1.3')
			await writeFile(path.join(fixture.publisher, 'CHANGELOG.md'), STABLE_BASELINE_CHANGELOG)
			const stableBaselineCommit = await commitAll(
				fixture,
				fixture.publisher,
				'new stable baseline',
			)
			await createAnnotatedTag(fixture, fixture.publisher, 'v0.1.3', stableBaselineCommit)
			await runGit(fixture.publisher, fixture.globalConfig, [
				'push',
				'--atomic',
				'origin',
				'refs/tags/v0.1.3:refs/tags/v0.1.3',
				`${stableBaselineCommit}:refs/heads/release-ledger/stable`,
				`${stableBaselineCommit}:refs/heads/stable-baseline`,
			])

			await runGit(fixture.publisher, fixture.globalConfig, [
				'switch',
				'--detach',
				previousBetaCommit,
			])
			await writeVersionFiles(fixture.publisher, '0.1.3', '0.1.3')
			await writeFile(path.join(fixture.publisher, 'CHANGELOG.md'), NEXT_BETA_CHANGELOG)
			await writeFile(path.join(fixture.publisher, 'divergent.txt'), 'does not contain stable\n')
			const divergentCandidate = await commitAll(
				fixture,
				fixture.publisher,
				'divergent beta candidate',
			)
			await runGit(fixture.publisher, fixture.globalConfig, [
				'push',
				'origin',
				`${divergentCandidate}:refs/heads/beta-candidate`,
			])

			await expect(
				runReleasePreflight({ repoRoot: fixture.publisher, channel: 'beta' }),
			).rejects.toThrow()

			await runGit(fixture.publisher, fixture.globalConfig, [
				'switch',
				'--detach',
				stableBaselineCommit,
			])
			await writeFile(path.join(fixture.publisher, 'CHANGELOG.md'), NEXT_BETA_CHANGELOG)
			await writeFile(path.join(fixture.publisher, 'successor.txt'), 'contains stable\n')
			const validCandidate = await commitAll(fixture, fixture.publisher, 'valid beta candidate')
			await runGit(fixture.publisher, fixture.globalConfig, [
				'push',
				'origin',
				`${validCandidate}:refs/heads/valid-beta-candidate`,
			])

			await expect(
				runReleasePreflight({ repoRoot: fixture.publisher, channel: 'beta' }),
			).resolves.toMatchObject({
				plan: {
					kind: 'claim',
					version: '0.1.4-beta.1',
					commit: validCandidate,
					expectedLedgerCommit: previousBetaCommit,
				},
			})
		})
	})

	test.each(['head', 'config', 'changelog'] as const)(
		'构建后 %s 漂移时拒绝旧快照',
		async (drift) => {
			await withFixture(async (fixture) => {
				const snapshot = await runReleasePreflight({
					repoRoot: fixture.publisher,
					channel: 'stable',
				})

				if (drift === 'head') {
					await writeFile(path.join(fixture.publisher, 'after-build.txt'), 'drift\n')
					await commitAll(fixture, fixture.publisher, 'head drift')
				} else if (drift === 'config') {
					await writeJson(path.join(fixture.publisher, 'package.json'), {
						name: 'stoneflow-release-fixture',
						private: true,
						version: '0.1.3',
						description: 'drift',
					})
				} else {
					await writeFile(
						path.join(fixture.publisher, 'CHANGELOG.md'),
						CURRENT_CHANGELOG.replace('Candidate release.', 'Changed after build.'),
					)
				}

				await expect(revalidateReleasePreflight(snapshot)).rejects.toThrow()
			})
		},
	)

	test('构建后 release refs 漂移时拒绝旧候选，而不是自动改为 reuse', async () => {
		await withFixture(async (fixture) => {
			const snapshot = await runReleasePreflight({
				repoRoot: fixture.publisher,
				channel: 'stable',
			})
			await createAnnotatedTag(fixture, fixture.publisher, 'v0.1.3', fixture.candidateCommit)
			await runGit(fixture.publisher, fixture.globalConfig, [
				'push',
				'--atomic',
				'origin',
				'refs/tags/v0.1.3:refs/tags/v0.1.3',
				`${fixture.candidateCommit}:refs/heads/release-ledger/stable`,
			])

			await expect(revalidateReleasePreflight(snapshot)).rejects.toThrow()
		})
	})

	test('已有 Tag 的 checkout 即使不在公共分支也可 reuse，ledger 后继方向正确', async () => {
		await withFixture(
			async (fixture) => {
				await createAnnotatedTag(fixture, fixture.publisher, 'v0.1.3', fixture.candidateCommit)
				await runGit(fixture.publisher, fixture.globalConfig, [
					'push',
					'--atomic',
					'origin',
					'refs/tags/v0.1.3:refs/tags/v0.1.3',
					`${fixture.candidateCommit}:refs/heads/release-ledger/stable`,
				])
				await runGit(fixture.rival, fixture.globalConfig, [
					'fetch',
					'--no-tags',
					'origin',
					'refs/tags/v0.1.3:refs/tags/v0.1.3',
				])
				await runGit(fixture.rival, fixture.globalConfig, [
					'switch',
					'--detach',
					fixture.candidateCommit,
				])
				await writeVersionFiles(fixture.rival, '0.1.4', '0.1.4')
				await writeFile(
					path.join(fixture.rival, 'CHANGELOG.md'),
					CURRENT_CHANGELOG.replace(
						'## [0.1.3] - 2026-08-06',
						'## [0.1.4] - 2026-08-07\n\n### 修复\n\n- Successor release.\n\n## [0.1.3] - 2026-08-06',
					),
				)
				const successor = await commitAll(fixture, fixture.rival, 'successor release')
				await createAnnotatedTag(fixture, fixture.rival, 'v0.1.4', successor)
				await runGit(fixture.rival, fixture.globalConfig, [
					'push',
					'--atomic',
					'origin',
					'refs/tags/v0.1.4:refs/tags/v0.1.4',
					`${successor}:refs/heads/release-ledger/stable`,
				])
				expect(
					await runGit(fixture.remote, fixture.globalConfig, ['rev-parse', 'refs/heads/main']),
				).toBe(fixture.baseCommit)

				const snapshot = await runReleasePreflight({
					repoRoot: fixture.publisher,
					channel: 'stable',
				})
				expect(await revalidateReleasePreflight(snapshot)).toEqual({
					kind: 'reuse',
					version: '0.1.3',
					tagName: 'v0.1.3',
					commit: fixture.candidateCommit,
					expectedLedgerCommit: successor,
				})
			},
			{ publishCandidate: false },
		)
	})
})
