import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
	RELEASE_TAG_SCHEMA,
	type ReleaseChannel,
	type ReleaseLedgerSnapshot,
	type ReleasePlan,
	type ReleaseTagSnapshot,
} from './types'

const SNAPSHOT_TAG_ROOT = 'refs/stoneflow-release/tags'
const SNAPSHOT_LEDGER_ROOT = 'refs/stoneflow-release/ledgers'
const SNAPSHOT_HEAD_ROOT = 'refs/stoneflow-release/heads'
const RELEASE_TAG_MARKER = 'stoneflow-release-schema:'
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i
const RELEASE_TAG_NAME_PATTERN =
	/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-beta\.(?:[1-9]\d*))?$/

interface GitResult {
	readonly exitCode: number
	readonly stdout: string
	readonly stdoutBytes: Uint8Array
	readonly stderr: string
}

export interface GitReleaseTagSnapshot extends ReleaseTagSnapshot {
	readonly objectId: string
}

export interface GitPublicHeadSnapshot {
	readonly name: string
	readonly commit: string
}

export interface ReleaseRefsSnapshot {
	readonly tags: readonly GitReleaseTagSnapshot[]
	readonly ledger: ReleaseLedgerSnapshot
	readonly publicHeads: readonly GitPublicHeadSnapshot[]
}

interface GitRepositoryInput {
	readonly cwd: string
	readonly remoteEndpoint: string
}

export interface ResolveReleaseRemoteEndpointInput {
	readonly cwd: string
	readonly remoteName: string
}

export interface RefreshReleaseRefsInput extends GitRepositoryInput {
	readonly channel: ReleaseChannel
}

export interface AssertReleaseAncestryInput {
	readonly cwd: string
	readonly commit: string
	readonly requiredCommits: readonly string[]
}

export interface CommitAncestryInput {
	readonly cwd: string
	readonly ancestor: string
	readonly descendant: string
}

export interface ClaimReleaseInput extends GitRepositoryInput {
	readonly channel: ReleaseChannel
	readonly plan: ReleasePlan
}

export interface ClaimReleaseResult {
	readonly status: 'claimed' | 'recovered' | 'reused'
}

export type AtomicPushExecutor = (cwd: string, args: readonly string[]) => Promise<void>

const BLOCKED_GIT_ENVIRONMENT = new Set([
	'GIT_DIR',
	'GIT_WORK_TREE',
	'GIT_COMMON_DIR',
	'GIT_INDEX_FILE',
	'GIT_OBJECT_DIRECTORY',
	'GIT_ALTERNATE_OBJECT_DIRECTORIES',
	'GIT_NAMESPACE',
	'GIT_NO_REPLACE_OBJECTS',
	'GIT_TERMINAL_PROMPT',
])

/** 构造发布 Git 子进程环境；Windows 下同样按大小写不敏感规则去重。 */
export function createReleaseGitEnvironment(
	base: NodeJS.ProcessEnv,
	overrides: NodeJS.ProcessEnv = {},
) {
	const result: Record<string, string | undefined> = { ...base }
	for (const [name, value] of Object.entries(overrides)) {
		const normalized = name.toUpperCase()
		for (const existing of Object.keys(result)) {
			if (existing.toUpperCase() === normalized) delete result[existing]
		}
		result[normalized.startsWith('GIT_') ? normalized : name] = value
	}
	for (const name of Object.keys(result)) {
		const normalized = name.toUpperCase()
		if (
			BLOCKED_GIT_ENVIRONMENT.has(normalized) ||
			normalized === 'GIT_CONFIG_COUNT' ||
			normalized === 'GIT_CONFIG_PARAMETERS' ||
			/^GIT_CONFIG_(?:KEY|VALUE)_\d+$/.test(normalized)
		) {
			delete result[name]
		}
	}
	result.GIT_NO_REPLACE_OBJECTS = '1'
	result.GIT_TERMINAL_PROMPT = '0'
	return result
}

async function executeGit(
	cwd: string,
	args: readonly string[],
	environment: NodeJS.ProcessEnv = {},
): Promise<GitResult> {
	const gitEnvironment = createReleaseGitEnvironment(process.env, environment)
	const disabledHooksDir = await mkdtemp(path.join(tmpdir(), 'stoneflow-release-hooks-'))
	try {
		const child = Bun.spawn(['git', '-c', `core.hooksPath=${disabledHooksDir}`, ...args], {
			cwd,
			env: gitEnvironment,
			stdout: 'pipe',
			stderr: 'pipe',
		})
		const [stdoutBuffer, stderr, exitCode] = await Promise.all([
			new Response(child.stdout).arrayBuffer(),
			new Response(child.stderr).text(),
			child.exited,
		])
		const stdoutBytes = new Uint8Array(stdoutBuffer)
		return { exitCode, stdout: new TextDecoder().decode(stdoutBytes), stdoutBytes, stderr }
	} finally {
		await rm(disabledHooksDir, { recursive: true, force: true }).catch(() => undefined)
	}
}

function gitError(args: readonly string[], result: GitResult) {
	const detail = (result.stderr || result.stdout).trim()
	return new Error(`Git ${args[0]} 失败${detail ? `：${detail}` : ''}`)
}

export async function runGit(
	cwd: string,
	args: readonly string[],
	environment?: NodeJS.ProcessEnv,
) {
	const result = await executeGit(cwd, args, environment)
	if (result.exitCode !== 0) throw gitError(args, result)
	return result.stdout
}

/** 读取固定 Git 对象中的 UTF-8 文本；非法字节必须在发布前失败。 */
export async function readGitBlobUtf8(cwd: string, objectName: string) {
	const args = ['cat-file', 'blob', objectName]
	const result = await executeGit(cwd, args)
	if (result.exitCode !== 0) throw gitError(args, result)
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(result.stdoutBytes)
	} catch {
		throw new Error(`Git blob ${objectName} 不是合法 UTF-8`)
	}
}

async function assertNoLegacyGrafts(cwd: string) {
	const gitPath = (await runGit(cwd, ['rev-parse', '--git-path', 'info/grafts'])).trim()
	const graftPath = path.resolve(cwd, gitPath)
	let contents: string
	try {
		contents = await readFile(graftPath, 'utf8')
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
		throw new Error(`无法检查 Git graft 文件：${(error as Error).message}`)
	}
	if (contents.trim()) {
		throw new Error('发布 ancestry 校验拒绝非空 .git/info/grafts')
	}
}

export async function resolveReleaseRemoteEndpoint({
	cwd,
	remoteName,
}: ResolveReleaseRemoteEndpointInput) {
	const args = ['remote', 'get-url', '--push', '--all', '--', remoteName]
	const result = await executeGit(cwd, args)
	if (result.exitCode !== 0) {
		throw new Error(`无法解析发布 remote ${remoteName} 的 push endpoint`)
	}
	const endpoints = result.stdout
		.split('\n')
		.map((endpoint) => endpoint.trim())
		.filter(Boolean)
	if (endpoints.length !== 1) {
		throw new Error(`发布 remote ${remoteName} 必须配置且只能配置一个 push endpoint`)
	}
	return endpoints[0]!
}

function assertCommitSha(commit: string, owner: string) {
	if (!COMMIT_SHA_PATTERN.test(commit)) {
		throw new Error(`${owner} 必须是完整 40 位 commit SHA，当前是 ${commit || '(空)'}`)
	}
}

function ledgerRef(channel: ReleaseChannel) {
	return `refs/heads/release-ledger/${channel}`
}

function snapshotLedgerRef(channel: ReleaseChannel) {
	return `${SNAPSHOT_LEDGER_ROOT}/${channel}`
}

function localTagRef(tagName: string) {
	return `refs/tags/${tagName}`
}

async function resolveRef(cwd: string, ref: string) {
	const args = ['rev-parse', '--verify', '--quiet', '--end-of-options', ref]
	const result = await executeGit(cwd, args)
	if (result.exitCode === 1) return null
	if (result.exitCode !== 0) throw gitError(args, result)
	return result.stdout.trim()
}

function parseTagObject(rawObject: string, tagName: string) {
	const separator = rawObject.indexOf('\n\n')
	if (separator < 0) {
		throw new Error(`annotated Tag ${tagName} 缺少 message`)
	}
	const headers = rawObject.slice(0, separator)
	const message = rawObject.slice(separator + 2)
	const targetType = /^type (.+)$/m.exec(headers)?.[1]
	if (targetType !== 'commit') {
		throw new Error(
			`annotated Tag ${tagName} 必须直接指向 commit，当前是 ${targetType ?? '(缺失)'}`,
		)
	}
	const declaredName = /^tag (.+)$/m.exec(headers)?.[1]
	if (declaredName !== tagName) {
		throw new Error(`annotated Tag ref ${tagName} 与对象内名称 ${declaredName ?? '(缺失)'} 不一致`)
	}

	const markerLines = message.split(/\r?\n/).filter((line) => line.startsWith(RELEASE_TAG_MARKER))
	if (markerLines.length > 1) {
		throw new Error(`annotated Tag ${tagName} 包含重复 schema marker`)
	}
	if (markerLines.length === 0) return null
	const schema = /^stoneflow-release-schema: (\S+)$/.exec(markerLines[0])?.[1]
	if (!schema) {
		throw new Error(`annotated Tag ${tagName} 的 schema marker 格式错误`)
	}
	return schema
}

async function readAnnotatedTag(
	cwd: string,
	ref: string,
	tagName: string,
): Promise<GitReleaseTagSnapshot> {
	const objectId = await resolveRef(cwd, ref)
	if (objectId === null) throw new Error(`Tag ref ${ref} 不存在`)
	assertCommitSha(objectId, `annotated Tag ${tagName} object`)
	const objectType = (await runGit(cwd, ['cat-file', '-t', objectId])).trim()
	if (objectType !== 'tag') {
		throw new Error(`远端 Tag ${tagName} 必须是 annotated Tag，当前是 ${objectType}`)
	}
	const rawObject = await runGit(cwd, ['cat-file', 'tag', objectId])
	const schema = parseTagObject(rawObject, tagName)
	const commit = (await runGit(cwd, ['rev-parse', '--verify', `${objectId}^{commit}`])).trim()
	assertCommitSha(commit, `远端 Tag ${tagName} peel commit`)
	return { name: tagName, commit, schema, objectId }
}

export async function refreshReleaseRefs({
	cwd,
	remoteEndpoint,
	channel,
}: RefreshReleaseRefsInput): Promise<ReleaseRefsSnapshot> {
	await runGit(cwd, [
		'fetch',
		'--atomic',
		'--quiet',
		'--no-tags',
		'--prune',
		'--no-prune-tags',
		'--no-write-fetch-head',
		'--no-auto-maintenance',
		remoteEndpoint,
		`+refs/tags/v*:refs/stoneflow-release/tags/v*`,
		`+refs/heads/release-ledger/*:refs/stoneflow-release/ledgers/*`,
		`+refs/heads/*:refs/stoneflow-release/heads/*`,
	])

	const refOutput = await runGit(cwd, [
		'for-each-ref',
		'--format=%(refname)',
		`${SNAPSHOT_TAG_ROOT}/`,
	])
	const tagRefs = refOutput
		.split('\n')
		.map((ref) => ref.trim())
		.filter(Boolean)
	const tags = await Promise.all(
		tagRefs.map((ref) => readAnnotatedTag(cwd, ref, ref.slice(`${SNAPSHOT_TAG_ROOT}/`.length))),
	)

	const ledgerSnapshotRef = snapshotLedgerRef(channel)
	const ledgerObject = await resolveRef(cwd, ledgerSnapshotRef)
	const commit = ledgerObject
		? (await runGit(cwd, ['rev-parse', '--verify', `${ledgerObject}^{commit}`])).trim()
		: null
	if (commit !== null) assertCommitSha(commit, `${channel} ledger commit`)

	const headOutput = await runGit(cwd, [
		'for-each-ref',
		'--format=%(refname)',
		`${SNAPSHOT_HEAD_ROOT}/`,
	])
	const publicHeads = await Promise.all(
		headOutput
			.split('\n')
			.map((ref) => ref.trim())
			.filter(Boolean)
			.filter((ref) => !ref.startsWith(`${SNAPSHOT_HEAD_ROOT}/release-ledger/`))
			.map(async (ref) => {
				const objectId = await resolveRef(cwd, ref)
				if (objectId === null) throw new Error(`远端 branch ref ${ref} 不存在`)
				const headCommit = (
					await runGit(cwd, ['rev-parse', '--verify', `${objectId}^{commit}`])
				).trim()
				assertCommitSha(headCommit, `远端 branch ${ref} commit`)
				return { name: ref.slice(`${SNAPSHOT_HEAD_ROOT}/`.length), commit: headCommit }
			}),
	)

	return { tags, ledger: { channel, commit }, publicHeads }
}

export async function assertReleaseAncestry({
	cwd,
	commit,
	requiredCommits,
}: AssertReleaseAncestryInput) {
	assertCommitSha(commit, '待发布 commit')
	await assertNoLegacyGrafts(cwd)
	const shallow = (await runGit(cwd, ['rev-parse', '--is-shallow-repository'])).trim()
	if (shallow === 'true') {
		throw new Error('发布 ancestry 校验不接受 shallow repository')
	}
	for (const requiredCommit of new Set(requiredCommits)) {
		if (!(await isCommitAncestor({ cwd, ancestor: requiredCommit, descendant: commit }))) {
			throw new Error(`待发布 commit ${commit} 不包含必需前驱 ${requiredCommit}`)
		}
	}
}

export async function isCommitAncestor({ cwd, ancestor, descendant }: CommitAncestryInput) {
	assertCommitSha(ancestor, 'ancestor commit')
	assertCommitSha(descendant, 'descendant commit')
	await assertNoLegacyGrafts(cwd)
	const args = ['merge-base', '--is-ancestor', ancestor, descendant]
	const result = await executeGit(cwd, args)
	if (result.exitCode === 0) return true
	if (result.exitCode === 1) return false
	throw gitError(args, result)
}

async function verifyRemoteClaim(input: ClaimReleaseInput): Promise<GitReleaseTagSnapshot | null> {
	const snapshot = await refreshReleaseRefs(input)
	const remoteTag = snapshot.tags.find((tag) => tag.name === input.plan.tagName)
	if (remoteTag === undefined) return null
	if (remoteTag.commit !== input.plan.commit) {
		throw new Error(
			`版本 ${input.plan.version} 已绑定到 commit ${remoteTag.commit}，当前 commit 是 ${input.plan.commit}`,
		)
	}
	if (remoteTag.schema !== RELEASE_TAG_SCHEMA) {
		throw new Error(`远端 Tag ${remoteTag.name} 不是 schema ${RELEASE_TAG_SCHEMA}`)
	}
	if (snapshot.ledger.commit === null) {
		throw new Error(`${input.channel} ledger 缺失，无法确认版本 ${input.plan.version}`)
	}
	try {
		await assertReleaseAncestry({
			cwd: input.cwd,
			commit: snapshot.ledger.commit,
			requiredCommits: [input.plan.commit],
		})
	} catch {
		throw new Error(
			`${input.channel} ledger ${snapshot.ledger.commit} 不包含版本 ${input.plan.version} 的 commit`,
		)
	}
	return remoteTag
}

async function deleteCreatedLocalTag(cwd: string, tagName: string, objectId: string) {
	await runGit(cwd, ['update-ref', '-d', localTagRef(tagName), objectId])
}

async function reconcileLocalTag(
	input: ClaimReleaseInput,
	localObjectId: string,
	remoteTag: GitReleaseTagSnapshot,
	createdLocalTag: boolean,
) {
	if (localObjectId === remoteTag.objectId) return
	if (!createdLocalTag) {
		throw new Error(
			`本地 Tag ${input.plan.tagName} 与远端 annotated tag object 冲突，未自动修改预先存在的本地 ref`,
		)
	}
	await deleteCreatedLocalTag(input.cwd, input.plan.tagName, localObjectId)
	await runGit(input.cwd, [
		'fetch',
		'--quiet',
		'--no-tags',
		input.remoteEndpoint,
		`${localTagRef(input.plan.tagName)}:${localTagRef(input.plan.tagName)}`,
	])
	const canonicalTag = await readAnnotatedTag(
		input.cwd,
		localTagRef(input.plan.tagName),
		input.plan.tagName,
	)
	if (
		canonicalTag.objectId !== remoteTag.objectId ||
		canonicalTag.commit !== remoteTag.commit ||
		canonicalTag.schema !== remoteTag.schema
	) {
		await deleteCreatedLocalTag(input.cwd, input.plan.tagName, canonicalTag.objectId)
		throw new Error(`恢复本地 Tag ${input.plan.tagName} 时远端对象发生变化`)
	}
}

export async function claimRelease(
	input: ClaimReleaseInput,
	executeAtomicPush: AtomicPushExecutor = async (cwd, args) => {
		await runGit(cwd, args)
	},
): Promise<ClaimReleaseResult> {
	if (input.channel !== 'stable' && input.channel !== 'beta') {
		throw new Error(`不支持的发布渠道：${String(input.channel)}`)
	}
	if (input.plan.tagName !== `v${input.plan.version}`) {
		throw new Error(`发布 Tag ${input.plan.tagName} 与版本 ${input.plan.version} 不一致`)
	}
	if (!RELEASE_TAG_NAME_PATTERN.test(input.plan.tagName)) {
		throw new Error(`发布 Tag 名称不合法：${input.plan.tagName}`)
	}
	assertCommitSha(input.plan.commit, '待发布 commit')

	if (input.plan.kind === 'reuse') {
		const remoteTag = await verifyRemoteClaim(input)
		if (remoteTag === null) {
			throw new Error(`远端缺少待复用 Tag ${input.plan.tagName}`)
		}
		return { status: 'reused' }
	}
	if (input.plan.expectedLedgerCommit !== null) {
		await assertReleaseAncestry({
			cwd: input.cwd,
			commit: input.plan.commit,
			requiredCommits: [input.plan.expectedLedgerCommit],
		})
	}

	const tagRef = localTagRef(input.plan.tagName)
	let localObjectId = await resolveRef(input.cwd, tagRef)
	let createdLocalTag = false
	if (localObjectId === null) {
		await runGit(input.cwd, [
			'tag',
			'--annotate',
			'--no-sign',
			`--message=${RELEASE_TAG_MARKER} ${RELEASE_TAG_SCHEMA}`,
			input.plan.tagName,
			input.plan.commit,
		])
		localObjectId = await resolveRef(input.cwd, tagRef)
		if (localObjectId === null) throw new Error(`创建本地 Tag ${input.plan.tagName} 后无法读取`)
		createdLocalTag = true
	} else {
		const localTag = await readAnnotatedTag(input.cwd, tagRef, input.plan.tagName)
		if (localTag.commit !== input.plan.commit || localTag.schema !== RELEASE_TAG_SCHEMA) {
			throw new Error(`预先存在的本地 Tag ${input.plan.tagName} 与待发布身份不一致`)
		}
		const remoteTag = await verifyRemoteClaim(input)
		if (remoteTag !== null) {
			await reconcileLocalTag(input, localObjectId, remoteTag, false)
			return { status: 'recovered' }
		}
	}

	const channelLedgerRef = ledgerRef(input.channel)
	const lease = `--force-with-lease=${channelLedgerRef}:${input.plan.expectedLedgerCommit ?? ''}`
	const pushArgs = [
		'push',
		'--atomic',
		'--no-follow-tags',
		lease,
		input.remoteEndpoint,
		`${tagRef}:${tagRef}`,
		`${input.plan.commit}:${channelLedgerRef}`,
	]

	try {
		await executeAtomicPush(input.cwd, pushArgs)
		return { status: 'claimed' }
	} catch (pushError) {
		let remoteTag: GitReleaseTagSnapshot | null
		try {
			remoteTag = await verifyRemoteClaim(input)
		} catch (verificationError) {
			if (createdLocalTag) {
				await deleteCreatedLocalTag(input.cwd, input.plan.tagName, localObjectId)
			}
			throw verificationError
		}
		if (remoteTag === null) {
			if (createdLocalTag) {
				await deleteCreatedLocalTag(input.cwd, input.plan.tagName, localObjectId)
			}
			throw pushError
		}
		await reconcileLocalTag(input, localObjectId, remoteTag, createdLocalTag)
		return { status: 'recovered' }
	}
}
