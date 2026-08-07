import { existsSync } from 'node:fs'
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'bun:test'

import {
	assertReleaseAncestry,
	claimRelease,
	createReleaseGitEnvironment,
	refreshReleaseRefs,
	runGit as runReleaseGit,
} from './git'
import { RELEASE_TAG_SCHEMA, type ReleasePlan } from './types'

interface GitFixture {
	readonly root: string
	readonly remote: string
	readonly cloneA: string
	readonly cloneB: string
	readonly baseCommit: string
	readonly globalConfig: string
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

async function createFixture(): Promise<GitFixture> {
	const root = await mkdtemp(path.join(tmpdir(), 'stoneflow-release-git-'))
	const remote = path.join(root, 'remote.git')
	const cloneA = path.join(root, 'clone-a')
	const cloneB = path.join(root, 'clone-b')
	const globalConfig = path.join(root, 'empty.gitconfig')
	await writeFile(globalConfig, '')

	await runGit(root, globalConfig, ['init', '--bare', remote])
	await runGit(remote, globalConfig, ['config', 'receive.denyDeletes', 'true'])
	await runGit(remote, globalConfig, ['config', 'receive.denyNonFastForwards', 'true'])
	await runGit(root, globalConfig, ['clone', remote, cloneA])
	await configureClone(cloneA, globalConfig, 'A')
	await writeFile(path.join(cloneA, 'history.txt'), 'base\n')
	await runGit(cloneA, globalConfig, ['add', '--', 'history.txt'])
	await runGit(cloneA, globalConfig, ['commit', '--message', 'base'])
	await runGit(cloneA, globalConfig, ['branch', '--move', 'main'])
	const baseCommit = await runGit(cloneA, globalConfig, ['rev-parse', 'HEAD'])
	await runGit(cloneA, globalConfig, ['push', '--set-upstream', 'origin', 'main'])
	await runGit(remote, globalConfig, ['symbolic-ref', 'HEAD', 'refs/heads/main'])
	await runGit(cloneA, globalConfig, [
		'push',
		'origin',
		`${baseCommit}:refs/heads/release-ledger/beta`,
	])
	await runGit(root, globalConfig, ['clone', remote, cloneB])
	await configureClone(cloneB, globalConfig, 'B')

	return { root, remote, cloneA, cloneB, baseCommit, globalConfig }
}

async function withFixture(run: (fixture: GitFixture) => Promise<void>) {
	const fixture = await createFixture()
	try {
		await run(fixture)
	} finally {
		await rm(fixture.root, { recursive: true, force: true })
	}
}

async function commitFile(fixture: GitFixture, cwd: string, name: string, content = `${name}\n`) {
	await writeFile(path.join(cwd, name), content)
	await runGit(cwd, fixture.globalConfig, ['add', '--', name])
	await runGit(cwd, fixture.globalConfig, ['commit', '--message', name])
	return runGit(cwd, fixture.globalConfig, ['rev-parse', 'HEAD'])
}

async function checkoutCommit(fixture: GitFixture, cwd: string, commit: string) {
	await runGit(cwd, fixture.globalConfig, ['switch', '--detach', commit])
}

async function createAnnotatedTag(
	fixture: GitFixture,
	cwd: string,
	name: string,
	commit: string,
	schema = RELEASE_TAG_SCHEMA,
) {
	await runGit(cwd, fixture.globalConfig, [
		'tag',
		'--annotate',
		'--no-sign',
		'--message',
		`StoneFlow ${name}\n\nstoneflow-release-schema: ${schema}`,
		name,
		commit,
	])
}

function releasePlan(
	version: string,
	commit: string,
	expectedLedgerCommit: string | null,
	kind: ReleasePlan['kind'] = 'claim',
): ReleasePlan {
	return {
		kind,
		version,
		tagName: `v${version}`,
		commit,
		expectedLedgerCommit,
	}
}

async function remoteRef(fixture: GitFixture, ref: string) {
	return runGit(fixture.remote, fixture.globalConfig, ['rev-parse', ref])
}

async function remoteCommit(fixture: GitFixture, ref: string) {
	return runGit(fixture.remote, fixture.globalConfig, ['rev-parse', `${ref}^{commit}`])
}

async function remoteRefExists(fixture: GitFixture, ref: string) {
	const result = await runGitResult(fixture.remote, fixture.globalConfig, [
		'show-ref',
		'--verify',
		'--quiet',
		ref,
	])
	return result.exitCode === 0
}

async function createLinearContenders(fixture: GitFixture) {
	const winnerCommit = await commitFile(fixture, fixture.cloneA, 'winner.txt')
	await runGit(fixture.cloneA, fixture.globalConfig, [
		'push',
		'origin',
		`${winnerCommit}:refs/heads/main`,
	])
	await runGit(fixture.cloneB, fixture.globalConfig, ['fetch', '--no-tags', 'origin', 'main'])
	await checkoutCommit(fixture, fixture.cloneB, winnerCommit)
	const loserCommit = await commitFile(fixture, fixture.cloneB, 'loser-successor.txt')
	return { winnerCommit, loserCommit }
}

describe('release Git protocol', () => {
	test('发布 Git 环境按大小写不敏感规则移除受控变量', () => {
		const environment = createReleaseGitEnvironment(
			{
				Git_Dir: '/wrong/repository',
				git_config_count: '1',
				Git_Config_Key_0: 'core.hooksPath',
				git_config_value_0: '/wrong/hooks',
				git_no_replace_objects: '0',
				KEEP: 'yes',
			},
			{ Git_Config_Global: '/safe/config' },
		)

		expect(environment).toMatchObject({
			GIT_CONFIG_GLOBAL: '/safe/config',
			GIT_NO_REPLACE_OBJECTS: '1',
			GIT_TERMINAL_PROMPT: '0',
			KEEP: 'yes',
		})
		expect(
			Object.keys(environment).filter((name) =>
				['GIT_DIR', 'GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0'].includes(
					name.toUpperCase(),
				),
			),
		).toEqual([])
	})

	test('发布 Git 子进程不执行仓库配置的 hooks', async () => {
		await withFixture(async (fixture) => {
			const commit = await commitFile(fixture, fixture.cloneA, 'hook-safe-candidate.txt')
			await runGit(fixture.cloneA, fixture.globalConfig, [
				'push',
				'origin',
				`${commit}:refs/heads/main`,
			])
			const hooksDir = path.join(fixture.root, 'malicious-hooks')
			const sentinel = path.join(fixture.root, 'hook-ran')
			await mkdir(hooksDir)
			for (const hook of ['pre-push', 'reference-transaction']) {
				const hookPath = path.join(hooksDir, hook)
				await writeFile(hookPath, `#!/bin/sh\nprintf invoked >> '${sentinel}'\nexit 1\n`)
				await chmod(hookPath, 0o755)
			}
			await runGit(fixture.cloneA, fixture.globalConfig, ['config', 'core.hooksPath', hooksDir])

			await runReleaseGit(fixture.cloneA, ['status', '--short'])
			await refreshReleaseRefs({
				cwd: fixture.cloneA,
				remoteEndpoint: fixture.remote,
				channel: 'beta',
			})
			await expect(
				claimRelease({
					cwd: fixture.cloneA,
					remoteEndpoint: fixture.remote,
					channel: 'beta',
					plan: releasePlan('0.1.2-beta.1', commit, fixture.baseCommit),
				}),
			).resolves.toEqual({ status: 'claimed' })
			expect(existsSync(sentinel)).toBe(false)
		})
	})

	test('每次从 remote 刷新并 peel annotated tags、schema 与渠道 ledger', async () => {
		await withFixture(async (fixture) => {
			await createAnnotatedTag(fixture, fixture.cloneB, 'v9.9.9', fixture.baseCommit)
			const before = await refreshReleaseRefs({
				cwd: fixture.cloneB,
				remoteEndpoint: fixture.remote,
				channel: 'beta',
			})
			expect(before.tags).toEqual([])
			expect(before.ledger).toEqual({ channel: 'beta', commit: fixture.baseCommit })
			expect(before.publicHeads).toEqual([{ name: 'main', commit: fixture.baseCommit }])

			await createAnnotatedTag(fixture, fixture.cloneA, 'v0.1.1', fixture.baseCommit, 'legacy-seed')
			const betaCommit = await commitFile(fixture, fixture.cloneA, 'beta.txt')
			await createAnnotatedTag(fixture, fixture.cloneA, 'v0.1.2-beta.1', betaCommit)
			await runGit(fixture.cloneA, fixture.globalConfig, [
				'push',
				'--atomic',
				'origin',
				'refs/tags/v0.1.1:refs/tags/v0.1.1',
				'refs/tags/v0.1.2-beta.1:refs/tags/v0.1.2-beta.1',
				`${betaCommit}:refs/heads/release-ledger/beta`,
			])

			const snapshot = await refreshReleaseRefs({
				cwd: fixture.cloneB,
				remoteEndpoint: fixture.remote,
				channel: 'beta',
			})
			expect(snapshot.ledger).toEqual({ channel: 'beta', commit: betaCommit })
			expect(snapshot.tags).toHaveLength(2)
			expect(snapshot.tags).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name: 'v0.1.1',
						commit: fixture.baseCommit,
						schema: 'legacy-seed',
					}),
					expect.objectContaining({
						name: 'v0.1.2-beta.1',
						commit: betaCommit,
						schema: RELEASE_TAG_SCHEMA,
					}),
				]),
			)

			const betaTag = snapshot.tags.find((tag) => tag.name === 'v0.1.2-beta.1')!
			expect(betaTag.objectId).toBe(await remoteRef(fixture, 'refs/tags/v0.1.2-beta.1'))
			expect(betaTag.objectId).not.toBe(betaTag.commit)
			expect(snapshot.tags.some((tag) => tag.name === 'v9.9.9')).toBe(false)

			await runGit(fixture.remote, fixture.globalConfig, ['update-ref', '-d', 'refs/tags/v0.1.1'])
			await runGit(fixture.remote, fixture.globalConfig, [
				'update-ref',
				'-d',
				'refs/tags/v0.1.2-beta.1',
			])
			await runGit(fixture.remote, fixture.globalConfig, [
				'update-ref',
				'-d',
				'refs/heads/release-ledger/beta',
			])
			const afterDeletion = await refreshReleaseRefs({
				cwd: fixture.cloneB,
				remoteEndpoint: fixture.remote,
				channel: 'beta',
			})
			expect(afterDeletion).toEqual({
				tags: [],
				ledger: { channel: 'beta', commit: null },
				publicHeads: [{ name: 'main', commit: fixture.baseCommit }],
			})
			expect(
				await runGit(fixture.cloneB, fixture.globalConfig, [
					'rev-parse',
					'refs/tags/v9.9.9^{commit}',
				]),
			).toBe(fixture.baseCommit)
		})
	})

	test('拒绝 lightweight Tag 与重复 schema marker', async () => {
		await withFixture(async (fixture) => {
			await runGit(fixture.cloneA, fixture.globalConfig, ['tag', 'v0.1.1', fixture.baseCommit])
			await runGit(fixture.cloneA, fixture.globalConfig, [
				'push',
				'origin',
				'refs/tags/v0.1.1:refs/tags/v0.1.1',
			])
			await expect(
				refreshReleaseRefs({
					cwd: fixture.cloneB,
					remoteEndpoint: fixture.remote,
					channel: 'beta',
				}),
			).rejects.toThrow('annotated Tag')

			await runGit(fixture.remote, fixture.globalConfig, ['update-ref', '-d', 'refs/tags/v0.1.1'])
			await runGit(fixture.cloneA, fixture.globalConfig, ['tag', '--delete', 'v0.1.1'])
			await runGit(fixture.cloneA, fixture.globalConfig, [
				'tag',
				'--annotate',
				'--no-sign',
				'--message',
				'stoneflow-release-schema: 1\nstoneflow-release-schema: 1',
				'v0.1.1',
				fixture.baseCommit,
			])
			await runGit(fixture.cloneA, fixture.globalConfig, [
				'push',
				'origin',
				'refs/tags/v0.1.1:refs/tags/v0.1.1',
			])
			await expect(
				refreshReleaseRefs({
					cwd: fixture.cloneB,
					remoteEndpoint: fixture.remote,
					channel: 'beta',
				}),
			).rejects.toThrow('重复 schema marker')
		})
	})

	test('候选 commit 必须包含全部 required commits', async () => {
		await withFixture(async (fixture) => {
			const mainCommit = await commitFile(fixture, fixture.cloneA, 'main.txt')
			await checkoutCommit(fixture, fixture.cloneA, fixture.baseCommit)
			const forkCommit = await commitFile(fixture, fixture.cloneA, 'fork.txt')

			await expect(
				assertReleaseAncestry({
					cwd: fixture.cloneA,
					commit: forkCommit,
					requiredCommits: [fixture.baseCommit],
				}),
			).resolves.toBeUndefined()
			await expect(
				assertReleaseAncestry({
					cwd: fixture.cloneA,
					commit: forkCommit,
					requiredCommits: [mainCommit],
				}),
			).rejects.toThrow()
		})
	})

	test('本地 replace ref 不得伪造发布 ancestry', async () => {
		await withFixture(async (fixture) => {
			const requiredCommit = await commitFile(fixture, fixture.cloneA, 'required.txt')
			await checkoutCommit(fixture, fixture.cloneA, fixture.baseCommit)
			const forkCommit = await commitFile(fixture, fixture.cloneA, 'fork.txt')
			const tree = await runGit(fixture.cloneA, fixture.globalConfig, [
				'rev-parse',
				`${forkCommit}^{tree}`,
			])
			const replacementCommit = await runGit(fixture.cloneA, fixture.globalConfig, [
				'commit-tree',
				tree,
				'-p',
				requiredCommit,
				'-m',
				'forged ancestry',
			])
			await runGit(fixture.cloneA, fixture.globalConfig, ['replace', forkCommit, replacementCommit])

			await expect(
				assertReleaseAncestry({
					cwd: fixture.cloneA,
					commit: forkCommit,
					requiredCommits: [requiredCommit],
				}),
			).rejects.toThrow()
		})
	})

	test('旧 graft 文件不得伪造发布 ancestry', async () => {
		await withFixture(async (fixture) => {
			const requiredCommit = await commitFile(fixture, fixture.cloneA, 'required.txt')
			await checkoutCommit(fixture, fixture.cloneA, fixture.baseCommit)
			const forkCommit = await commitFile(fixture, fixture.cloneA, 'fork.txt')
			await writeFile(
				path.join(fixture.cloneA, '.git', 'info', 'grafts'),
				`${forkCommit} ${requiredCommit}\n`,
			)

			await expect(
				assertReleaseAncestry({
					cwd: fixture.cloneA,
					commit: forkCommit,
					requiredCommits: [requiredCommit],
				}),
			).rejects.toThrow('.git/info/grafts')
		})
	})

	test('同名 Tag 竞争失败时不会单独推进本可 fast-forward 的 ledger', async () => {
		await withFixture(async (fixture) => {
			const { winnerCommit, loserCommit } = await createLinearContenders(fixture)
			const winnerPlan = releasePlan('0.1.2-beta.1', winnerCommit, fixture.baseCommit)
			const loserPlan = releasePlan('0.1.2-beta.1', loserCommit, fixture.baseCommit)

			expect(
				await claimRelease({
					cwd: fixture.cloneA,
					remoteEndpoint: fixture.remote,
					channel: 'beta',
					plan: winnerPlan,
				}),
			).toEqual({ status: 'claimed' })
			await expect(
				claimRelease({
					cwd: fixture.cloneB,
					remoteEndpoint: fixture.remote,
					channel: 'beta',
					plan: loserPlan,
				}),
			).rejects.toThrow()

			expect(await remoteCommit(fixture, 'refs/tags/v0.1.2-beta.1')).toBe(winnerCommit)
			expect(await remoteRef(fixture, 'refs/heads/release-ledger/beta')).toBe(winnerCommit)
		})
	})

	test('不同 Tag 即使 loser 是 winner 后继，也会因旧 ledger lease 整组失败', async () => {
		await withFixture(async (fixture) => {
			const { winnerCommit, loserCommit } = await createLinearContenders(fixture)
			const winnerPlan = releasePlan('0.1.2-beta.1', winnerCommit, fixture.baseCommit)
			const loserPlan = releasePlan('0.1.2-beta.2', loserCommit, fixture.baseCommit)

			await claimRelease({
				cwd: fixture.cloneA,
				remoteEndpoint: fixture.remote,
				channel: 'beta',
				plan: winnerPlan,
			})
			await expect(
				claimRelease({
					cwd: fixture.cloneB,
					remoteEndpoint: fixture.remote,
					channel: 'beta',
					plan: loserPlan,
				}),
			).rejects.toThrow()

			expect(await remoteRefExists(fixture, 'refs/tags/v0.1.2-beta.2')).toBe(false)
			expect(await remoteRef(fixture, 'refs/heads/release-ledger/beta')).toBe(winnerCommit)
		})
	})

	test('remote 不支持 atomic push 时直接失败且不顺序降级', async () => {
		await withFixture(async (fixture) => {
			const commit = await commitFile(fixture, fixture.cloneA, 'candidate.txt')
			await runGit(fixture.remote, fixture.globalConfig, [
				'config',
				'receive.advertiseAtomic',
				'false',
			])

			await expect(
				claimRelease({
					cwd: fixture.cloneA,
					remoteEndpoint: fixture.remote,
					channel: 'beta',
					plan: releasePlan('0.1.2-beta.1', commit, fixture.baseCommit),
				}),
			).rejects.toThrow()

			expect(await remoteRefExists(fixture, 'refs/tags/v0.1.2-beta.1')).toBe(false)
			expect(await remoteRef(fixture, 'refs/heads/release-ledger/beta')).toBe(fixture.baseCommit)
		})
	})

	test('首次 ledger 使用空 lease，远端一旦创建就拒绝旧计划继续推进', async () => {
		await withFixture(async (fixture) => {
			const firstCommit = await commitFile(fixture, fixture.cloneA, 'first-stable.txt')
			await claimRelease({
				cwd: fixture.cloneA,
				remoteEndpoint: fixture.remote,
				channel: 'stable',
				plan: releasePlan('0.1.1', firstCommit, null),
			})

			const successor = await commitFile(fixture, fixture.cloneA, 'second-stable.txt')
			await expect(
				claimRelease({
					cwd: fixture.cloneA,
					remoteEndpoint: fixture.remote,
					channel: 'stable',
					plan: releasePlan('0.1.2', successor, null),
				}),
			).rejects.toThrow()
			expect(await remoteRefExists(fixture, 'refs/tags/v0.1.2')).toBe(false)
			expect(await remoteRef(fixture, 'refs/heads/release-ledger/stable')).toBe(firstCommit)
		})
	})

	test('atomic push 响应丢失后重试可恢复，并允许复用后继 ledger 中的旧版本', async () => {
		await withFixture(async (fixture) => {
			const commit = await commitFile(fixture, fixture.cloneA, 'candidate.txt')
			const plan = releasePlan('0.1.2-beta.1', commit, fixture.baseCommit)

			let remoteAcceptedPush = false
			expect(
				await claimRelease(
					{
						cwd: fixture.cloneA,
						remoteEndpoint: fixture.remote,
						channel: 'beta',
						plan,
					},
					async (cwd, args) => {
						await runGit(cwd, fixture.globalConfig, args)
						remoteAcceptedPush = true
						throw new Error('模拟 push 成功后响应丢失')
					},
				),
			).toEqual({ status: 'recovered' })
			expect(remoteAcceptedPush).toBe(true)

			const successor = await commitFile(fixture, fixture.cloneA, 'successor.txt')
			await createAnnotatedTag(fixture, fixture.cloneA, 'v0.1.2-beta.2', successor)
			await runGit(fixture.cloneA, fixture.globalConfig, [
				'push',
				'--atomic',
				'origin',
				'refs/tags/v0.1.2-beta.2:refs/tags/v0.1.2-beta.2',
				`${successor}:refs/heads/release-ledger/beta`,
			])

			expect(
				await claimRelease({
					cwd: fixture.cloneA,
					remoteEndpoint: fixture.remote,
					channel: 'beta',
					plan: { ...plan, kind: 'reuse', expectedLedgerCommit: successor },
				}),
			).toEqual({ status: 'reused' })
		})
	})

	test('只清理本轮创建的 annotated Tag object 冲突，不改写预先存在的本地 Tag', async () => {
		await withFixture(async (fixture) => {
			const commit = await commitFile(fixture, fixture.cloneA, 'candidate.txt')
			await runGit(fixture.cloneA, fixture.globalConfig, [
				'push',
				'origin',
				`${commit}:refs/heads/main`,
			])
			await runGit(fixture.cloneB, fixture.globalConfig, ['fetch', '--no-tags', 'origin', 'main'])
			await checkoutCommit(fixture, fixture.cloneB, commit)
			await refreshReleaseRefs({
				cwd: fixture.cloneB,
				remoteEndpoint: fixture.remote,
				channel: 'beta',
			})

			const firstPlan = releasePlan('0.1.2-beta.1', commit, fixture.baseCommit)
			await claimRelease({
				cwd: fixture.cloneA,
				remoteEndpoint: fixture.remote,
				channel: 'beta',
				plan: firstPlan,
			})
			expect(
				await claimRelease({
					cwd: fixture.cloneB,
					remoteEndpoint: fixture.remote,
					channel: 'beta',
					plan: firstPlan,
				}),
			).toEqual({ status: 'recovered' })
			expect(
				await runGit(fixture.cloneB, fixture.globalConfig, [
					'rev-parse',
					'refs/tags/v0.1.2-beta.1',
				]),
			).toBe(await remoteRef(fixture, 'refs/tags/v0.1.2-beta.1'))

			const successor = await commitFile(fixture, fixture.cloneA, 'next-candidate.txt')
			await runGit(fixture.cloneA, fixture.globalConfig, [
				'push',
				'origin',
				`${successor}:refs/heads/main`,
			])
			await runGit(fixture.cloneB, fixture.globalConfig, ['fetch', '--no-tags', 'origin', 'main'])
			await checkoutCommit(fixture, fixture.cloneB, successor)
			await createAnnotatedTag(fixture, fixture.cloneB, 'v0.1.2-beta.2', successor)
			const localObjectBefore = await runGit(fixture.cloneB, fixture.globalConfig, [
				'rev-parse',
				'refs/tags/v0.1.2-beta.2',
			])
			const secondPlan = releasePlan('0.1.2-beta.2', successor, commit)
			await claimRelease({
				cwd: fixture.cloneA,
				remoteEndpoint: fixture.remote,
				channel: 'beta',
				plan: secondPlan,
			})
			expect(await remoteRef(fixture, 'refs/tags/v0.1.2-beta.2')).not.toBe(localObjectBefore)

			await expect(
				claimRelease({
					cwd: fixture.cloneB,
					remoteEndpoint: fixture.remote,
					channel: 'beta',
					plan: secondPlan,
				}),
			).rejects.toThrow()
			expect(
				await runGit(fixture.cloneB, fixture.globalConfig, [
					'rev-parse',
					'refs/tags/v0.1.2-beta.2',
				]),
			).toBe(localObjectBefore)
		})
	})
})
