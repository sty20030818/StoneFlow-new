import {
	getPublishableRelease,
	parseChangelogDocument,
	type ChangelogDocument,
} from '../../src/features/changelog/contract'
import {
	getRemoteObject,
	putRemoteObject,
	type ReleaseRemoteConfig,
	type RemoteObject,
	type S3ObjectClient,
} from './remote'
import type { ReleasePlan } from './types'

const CHANGELOG_KEY = 'stoneflow/CHANGELOG.md'
const CHANGELOG_CACHE_CONTROL = 'no-cache'

type FetchBytes = (url: string) => Promise<Uint8Array>

function changelogUrl(config: ReleaseRemoteConfig) {
	return `${config.publicUrl.replace(/\/$/, '')}/CHANGELOG.md`
}

function sameBytes(left: Uint8Array, right: Uint8Array) {
	return Buffer.from(left).equals(Buffer.from(right))
}

function decodeChangelog(bytes: Uint8Array, owner: string) {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
	} catch {
		throw new Error(`${owner} 不是有效 UTF-8`)
	}
}

function parsePublishedDocument(bytes: Uint8Array, owner: string) {
	return parseChangelogDocument(decodeChangelog(bytes, owner))
}

function assertPreservesRemoteHistory(local: ChangelogDocument, remote: ChangelogDocument) {
	const localByVersion = new Map(local.releases.map((release) => [release.version, release]))
	for (const remoteRelease of remote.releases) {
		const localRelease = localByVersion.get(remoteRelease.version)
		if (!localRelease) {
			throw new Error(`本地 CHANGELOG.md 缺少远端版本 ${remoteRelease.version}`)
		}
		if (localRelease.yanked !== remoteRelease.yanked) {
			throw new Error(`既有版本 ${remoteRelease.version} 的 YANKED 状态不可改变`)
		}
	}
}

function assertCompatibleDocuments(
	local: ChangelogDocument,
	remote: ChangelogDocument | null,
	targetVersion: string,
	releaseKind: ReleasePlan['kind'],
) {
	getPublishableRelease(local, targetVersion)
	if (!remote) return false
	const remoteHasTarget = remote.releases.some((release) => release.version === targetVersion)
	if (releaseKind === 'reuse' && remoteHasTarget) {
		getPublishableRelease(remote, targetVersion)
		return true
	}
	assertPreservesRemoteHistory(local, remote)
	return remoteHasTarget
}

async function defaultFetchBytes(url: string) {
	const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
	if (!response.ok) throw new Error(`公开 Changelog 读取失败：HTTP ${response.status}`)
	return new Uint8Array(await response.arrayBuffer())
}

async function validateRemoteObject(
	remote: RemoteObject | null,
	config: ReleaseRemoteConfig,
	targetVersion: string,
	fetchBytes: FetchBytes,
) {
	if (!remote) throw new Error('远端 CHANGELOG.md 不存在')
	const document = parsePublishedDocument(remote.bytes, 'S3 CHANGELOG.md')
	getPublishableRelease(document, targetVersion)
	const publicBytes = await fetchBytes(changelogUrl(config))
	if (!sameBytes(publicBytes, remote.bytes)) {
		throw new Error('公开 CHANGELOG.md 与 S3 bytes 不一致')
	}
}

export async function validatePublishedChangelog({
	client,
	config,
	targetVersion,
	fetchBytes = defaultFetchBytes,
}: {
	client: S3ObjectClient
	config: ReleaseRemoteConfig
	targetVersion: string
	fetchBytes?: FetchBytes
}) {
	await validateRemoteObject(
		await getRemoteObject(client, config.bucket, CHANGELOG_KEY),
		config,
		targetVersion,
		fetchBytes,
	)
}

/** 在不可逆 Git claim 前只读确认本地日志可覆盖当前远端历史。 */
export async function inspectChangelogCompatibility({
	client,
	config,
	source,
	targetVersion,
	releaseKind,
}: {
	client: S3ObjectClient
	config: ReleaseRemoteConfig
	source: string
	targetVersion: string
	releaseKind: ReleasePlan['kind']
}) {
	const localDocument = parseChangelogDocument(source)
	const remote = await getRemoteObject(client, config.bucket, CHANGELOG_KEY)
	const remoteDocument = remote ? parsePublishedDocument(remote.bytes, 'S3 CHANGELOG.md') : null
	assertCompatibleDocuments(localDocument, remoteDocument, targetVersion, releaseKind)
}

export async function publishChangelog({
	client,
	config,
	source,
	targetVersion,
	releaseKind,
	fetchBytes = defaultFetchBytes,
}: {
	client: S3ObjectClient
	config: ReleaseRemoteConfig
	source: string
	targetVersion: string
	releaseKind: ReleasePlan['kind']
	fetchBytes?: FetchBytes
}) {
	const localDocument = parseChangelogDocument(source)
	const localBytes = Buffer.from(source)
	let remote = await getRemoteObject(client, config.bucket, CHANGELOG_KEY)
	const remoteDocument = remote ? parsePublishedDocument(remote.bytes, 'S3 CHANGELOG.md') : null
	const remoteHasTarget = assertCompatibleDocuments(
		localDocument,
		remoteDocument,
		targetVersion,
		releaseKind,
	)

	if (releaseKind === 'reuse' && remoteHasTarget) {
		await validateRemoteObject(remote, config, targetVersion, fetchBytes)
		return
	}
	if (remote && sameBytes(remote.bytes, localBytes)) {
		await validateRemoteObject(remote, config, targetVersion, fetchBytes)
		return
	}

	let result: 'written' | 'conflict'
	try {
		result = await putRemoteObject(client, {
			bucket: config.bucket,
			key: CHANGELOG_KEY,
			body: localBytes,
			contentType: 'text/markdown; charset=utf-8',
			cacheControl: CHANGELOG_CACHE_CONTROL,
			...(remote ? { ifMatch: remote.etag } : { ifNoneMatch: '*' as const }),
		})
	} catch (error) {
		remote = await getRemoteObject(client, config.bucket, CHANGELOG_KEY)
		if (!remote || !sameBytes(remote.bytes, localBytes)) throw error
		await validateRemoteObject(remote, config, targetVersion, fetchBytes)
		return
	}

	remote = await getRemoteObject(client, config.bucket, CHANGELOG_KEY)
	if (!remote || !sameBytes(remote.bytes, localBytes)) {
		throw new Error(
			result === 'conflict'
				? 'CHANGELOG.md CAS 冲突，远端最终 bytes 与本地不同'
				: 'CHANGELOG.md 写入后 S3 bytes 不一致',
		)
	}
	await validateRemoteObject(remote, config, targetVersion, fetchBytes)
}
