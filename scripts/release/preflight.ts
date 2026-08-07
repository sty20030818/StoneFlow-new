import { createHash } from 'node:crypto'

import {
	getPublishableRelease,
	parseChangelogDocument,
} from '../../src/features/changelog/contract'
import {
	assertReleaseAncestry,
	isCommitAncestor,
	readGitBlobUtf8,
	refreshReleaseRefs,
	resolveReleaseRemoteEndpoint,
	runGit,
	type ReleaseRefsSnapshot,
} from './git'
import { resolveReleasePlan } from './release-plan'
import { RELEASE_TAG_SCHEMA, type ReleaseChannel, type ReleasePlan } from './types'

const STABLE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i

export interface ReleasePreflightInput {
	readonly repoRoot: string
	readonly remoteName?: string
}

export interface ReleasePreflightSnapshot {
	readonly repoRoot: string
	readonly remoteName: string
	readonly remoteEndpoint: string
	readonly channel: ReleaseChannel
	readonly releaseCommit: string
	readonly sourceVersion: string
	readonly updaterPublicKey: string
	readonly versionConfigurationSha256: string
	readonly changelogSource: string
	readonly changelogSha256: string
	readonly releaseRefs: ReleaseRefsSnapshot
	readonly plan: ReleasePlan
}

function sha256(source: string) {
	return createHash('sha256').update(source).digest('hex')
}

function readJson(source: string, owner: string) {
	try {
		return JSON.parse(source.replace(/^\uFEFF/, '')) as unknown
	} catch {
		throw new Error(`${owner} 不是有效 JSON`)
	}
}

function readVersion(value: unknown, owner: string) {
	if (!value || typeof value !== 'object' || !('version' in value)) {
		throw new Error(`${owner} 缺少 version`)
	}
	const version = (value as { version?: unknown }).version
	if (typeof version !== 'string' || !STABLE_VERSION_PATTERN.test(version)) {
		throw new Error(`${owner}.version 必须是无前导零的 Stable SemVer`)
	}
	return version
}

function readUpdaterPublicKey(value: unknown) {
	const publicKey = (value as { plugins?: { updater?: { pubkey?: unknown } } } | null)?.plugins
		?.updater?.pubkey
	if (typeof publicKey !== 'string' || !publicKey.trim()) {
		throw new Error('src-tauri/tauri.conf.json 缺少 plugins.updater.pubkey')
	}
	return publicKey
}

async function assertCleanWorktree(repoRoot: string) {
	const trackedEntries = await runGit(repoRoot, ['ls-files', '--cached', '-v', '-z'])
	const hiddenEntry = trackedEntries
		.split('\0')
		.filter(Boolean)
		.find((entry) => entry[0] === 'S' || /[a-z]/.test(entry[0] ?? ''))
	if (hiddenEntry) {
		throw new Error('发布不接受 assume-unchanged 或 skip-worktree 的 tracked 文件')
	}
	const status = await runGit(repoRoot, [
		'status',
		'--porcelain=v1',
		'-z',
		'--untracked-files=all',
		'--ignore-submodules=none',
	])
	if (status.length > 0) {
		throw new Error('发布要求工作区干净，当前存在 tracked 或 untracked 变更')
	}
}

async function resolveHeadCommit(repoRoot: string) {
	const commit = (await runGit(repoRoot, ['rev-parse', '--verify', 'HEAD^{commit}'])).trim()
	if (!COMMIT_SHA_PATTERN.test(commit)) {
		throw new Error(`HEAD 必须解析为完整 40 位 commit SHA，当前是 ${commit || '(空)'}`)
	}
	return commit
}

function targetChannelTag(tagName: string, channel: ReleaseChannel) {
	const beta = tagName.includes('-beta.')
	return channel === 'beta' ? beta : !beta
}

async function assertRemoteReachability(
	repoRoot: string,
	releaseCommit: string,
	releaseRefs: ReleaseRefsSnapshot,
	plan: ReleasePlan,
) {
	if (plan.kind === 'reuse') return
	const remoteTips = [
		...releaseRefs.publicHeads.map((head) => head.commit),
		...releaseRefs.tags.map((tag) => tag.commit),
	]
	for (const tip of new Set(remoteTips)) {
		if (
			await isCommitAncestor({
				cwd: repoRoot,
				ancestor: releaseCommit,
				descendant: tip,
			})
		) {
			return
		}
	}
	throw new Error(`待发布 commit ${releaseCommit} 无法从共享 remote 的公开分支到达`)
}

async function assertReleaseHistory(
	repoRoot: string,
	channel: ReleaseChannel,
	sourceVersion: string,
	releaseCommit: string,
	releaseRefs: ReleaseRefsSnapshot,
	plan: ReleasePlan,
) {
	await assertReleaseAncestry({ cwd: repoRoot, commit: releaseCommit, requiredCommits: [] })
	if (releaseRefs.ledger.commit !== null) {
		await assertReleaseAncestry({
			cwd: repoRoot,
			commit: releaseRefs.ledger.commit,
			requiredCommits: releaseRefs.tags
				.filter((tag) => targetChannelTag(tag.name, channel))
				.map((tag) => tag.commit),
		})
	}
	const requiredCommits: string[] = []
	if (plan.kind === 'claim' && plan.expectedLedgerCommit !== null) {
		requiredCommits.push(plan.expectedLedgerCommit)
	}
	if (channel === 'beta') {
		const stableBaseline = releaseRefs.tags.find((tag) => tag.name === `v${sourceVersion}`)
		if (!stableBaseline) throw new Error(`Beta 发布缺少 Stable 基线 v${sourceVersion}`)
		requiredCommits.push(stableBaseline.commit)
	}
	if (requiredCommits.length > 0) {
		await assertReleaseAncestry({
			cwd: repoRoot,
			commit: releaseCommit,
			requiredCommits,
		})
	}
}

function canonicalReleaseRefs(releaseRefs: ReleaseRefsSnapshot) {
	return JSON.stringify({
		tags: [...releaseRefs.tags]
			.map(({ name, commit, schema, objectId }) => ({ name, commit, schema, objectId }))
			.sort((left, right) => left.name.localeCompare(right.name)),
		ledger: releaseRefs.ledger,
	})
}

function canonicalPlan(plan: ReleasePlan) {
	return JSON.stringify(plan)
}

async function collectReleasePreflight({
	repoRoot,
	remoteName,
	remoteEndpoint,
}: {
	repoRoot: string
	remoteName: string
	remoteEndpoint: string
}): Promise<ReleasePreflightSnapshot> {
	await assertCleanWorktree(repoRoot)
	const releaseCommit = await resolveHeadCommit(repoRoot)
	const [packageSource, tauriConfigSource, changelogSource] = await Promise.all([
		readGitBlobUtf8(repoRoot, `${releaseCommit}:package.json`),
		readGitBlobUtf8(repoRoot, `${releaseCommit}:src-tauri/tauri.conf.json`),
		readGitBlobUtf8(repoRoot, `${releaseCommit}:CHANGELOG.md`),
	])
	const packageJson = readJson(packageSource, 'package.json')
	const tauriConfig = readJson(tauriConfigSource, 'src-tauri/tauri.conf.json')
	const packageVersion = readVersion(packageJson, 'package.json')
	const tauriVersion = readVersion(tauriConfig, 'src-tauri/tauri.conf.json')
	const updaterPublicKey = readUpdaterPublicKey(tauriConfig)
	if (packageVersion !== tauriVersion) {
		throw new Error(
			`package.json.version ${packageVersion} 与 tauri.conf.json.version ${tauriVersion} 不一致`,
		)
	}
	const changelogDocument = parseChangelogDocument(changelogSource)
	const targetRelease = changelogDocument.releases[0]
	if (!targetRelease) throw new Error('CHANGELOG.md 缺少当前发布版本')
	getPublishableRelease(changelogDocument, targetRelease.version)
	const channel: ReleaseChannel = targetRelease.version.includes('-beta.') ? 'beta' : 'stable'
	const releaseRefs = await refreshReleaseRefs({ cwd: repoRoot, remoteEndpoint, channel })
	const plan = resolveReleasePlan({
		channel,
		sourceVersion: packageVersion,
		commit: releaseCommit,
		tags: releaseRefs.tags,
		ledger: releaseRefs.ledger,
	})
	if (plan.version !== targetRelease.version) {
		throw new Error(
			`CHANGELOG.md 当前目标版本 ${targetRelease.version} 与发布计划 ${plan.version} 不一致`,
		)
	}
	if (plan.kind === 'claim') {
		const localVersions = new Set(changelogDocument.releases.map((release) => release.version))
		const missingTag = releaseRefs.tags.find(
			(tag) => tag.schema === RELEASE_TAG_SCHEMA && !localVersions.has(tag.name.slice(1)),
		)
		if (missingTag) {
			throw new Error(`本地 CHANGELOG.md 缺少已认领版本 ${missingTag.name.slice(1)}`)
		}
	}
	await assertRemoteReachability(repoRoot, releaseCommit, releaseRefs, plan)
	await assertReleaseHistory(repoRoot, channel, packageVersion, releaseCommit, releaseRefs, plan)
	await assertCleanWorktree(repoRoot)
	if ((await resolveHeadCommit(repoRoot)) !== releaseCommit) {
		throw new Error('发布预检期间 HEAD 已变化')
	}

	return {
		repoRoot,
		remoteName,
		remoteEndpoint,
		channel,
		releaseCommit,
		sourceVersion: packageVersion,
		updaterPublicKey,
		versionConfigurationSha256: sha256(`${packageSource}\0${tauriConfigSource}`),
		changelogSource,
		changelogSha256: sha256(changelogSource),
		releaseRefs,
		plan,
	}
}

export async function runReleasePreflight({
	repoRoot,
	remoteName = 'origin',
}: ReleasePreflightInput): Promise<ReleasePreflightSnapshot> {
	const remoteEndpoint = await resolveReleaseRemoteEndpoint({ cwd: repoRoot, remoteName })
	return collectReleasePreflight({ repoRoot, remoteName, remoteEndpoint })
}

export async function revalidateReleasePreflight(expected: ReleasePreflightSnapshot) {
	const remoteEndpoint = await resolveReleaseRemoteEndpoint({
		cwd: expected.repoRoot,
		remoteName: expected.remoteName,
	})
	if (remoteEndpoint !== expected.remoteEndpoint) {
		throw new Error(`构建期间发布 remote ${expected.remoteName} 的 push endpoint 已变化`)
	}
	const current = await collectReleasePreflight({
		repoRoot: expected.repoRoot,
		remoteName: expected.remoteName,
		remoteEndpoint: expected.remoteEndpoint,
	})
	if (current.releaseCommit !== expected.releaseCommit) {
		throw new Error('构建期间 HEAD 已变化')
	}
	if (current.sourceVersion !== expected.sourceVersion) {
		throw new Error('构建期间版本配置已变化')
	}
	if (current.versionConfigurationSha256 !== expected.versionConfigurationSha256) {
		throw new Error('构建期间版本配置文件已变化')
	}
	if (current.changelogSha256 !== expected.changelogSha256) {
		throw new Error('构建期间 CHANGELOG.md 已变化')
	}
	if (canonicalReleaseRefs(current.releaseRefs) !== canonicalReleaseRefs(expected.releaseRefs)) {
		throw new Error('构建期间 remote release refs 已变化')
	}
	if (canonicalPlan(current.plan) !== canonicalPlan(expected.plan)) {
		throw new Error('构建期间发布候选已变化')
	}
	return current.plan
}
