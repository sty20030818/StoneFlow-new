import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { compareChangelogVersions } from '../../src/features/changelog/contract'
import { platformLatestJsonKey, platformLatestJsonUrl, platformReleaseJsonKey } from './paths'
import {
	getRemoteObject,
	putRemoteObject,
	type ReleaseRemoteConfig,
	type RemoteObject,
	type S3ObjectClient,
} from './remote'
import { verifyUpdaterSignatureBytes } from './signature'
import type {
	ImmutableArtifactUpload,
	LatestJson,
	PlatformReleaseRecord,
	ReleaseChannel,
} from './types'

const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'
const POINTER_CACHE_CONTROL = 'no-cache'
const MAX_POINTER_RETRIES = 3
export const PUBLIC_ARTIFACT_TIMEOUT_MS = 5 * 60_000
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const COMMIT_PATTERN = /^[0-9a-f]{40}$/
const STABLE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

type FetchBytes = (url: string) => Promise<Uint8Array>
type FetchArtifactSha256 = (url: string) => Promise<string>

function sha256(bytes: Uint8Array) {
	return createHash('sha256').update(bytes).digest('hex')
}

function serializeJson(value: unknown) {
	return Buffer.from(`${JSON.stringify(value, null, 2)}\n`)
}

function normalizeJson(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(normalizeJson)
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, child]) => [key, normalizeJson(child)]),
		)
	}
	return value
}

function parseJson(bytes: Uint8Array, owner: string) {
	try {
		return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown
	} catch {
		throw new Error(`${owner} 不是有效 UTF-8 JSON`)
	}
}

function canonicalJson(value: unknown) {
	return JSON.stringify(normalizeJson(value))
}

function assertJsonEquals(bytes: Uint8Array, expected: unknown, owner: string) {
	if (canonicalJson(parseJson(bytes, owner)) !== canonicalJson(expected)) {
		throw new Error(`${owner} 与本次发布内容冲突`)
	}
}

async function defaultFetchBytes(url: string) {
	const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
	if (!response.ok) throw new Error(`公开对象读取失败：HTTP ${response.status}`)
	return new Uint8Array(await response.arrayBuffer())
}

async function defaultFetchArtifactSha256(url: string) {
	const response = await fetch(url, { signal: AbortSignal.timeout(PUBLIC_ARTIFACT_TIMEOUT_MS) })
	if (!response.ok) throw new Error(`公开产物读取失败：HTTP ${response.status}`)
	if (!response.body) throw new Error('公开产物响应缺少 body')
	const hash = createHash('sha256')
	const reader = response.body.getReader()
	try {
		while (true) {
			const { done, value } = await reader.read()
			if (done) break
			hash.update(value)
		}
	} finally {
		reader.releaseLock()
	}
	return hash.digest('hex')
}

function expectedPublicUrl(config: ReleaseRemoteConfig, key: string) {
	if (!key.startsWith('stoneflow/')) throw new Error(`发布对象 key 非法：${key}`)
	return `${config.publicUrl.replace(/\/$/, '')}/${key.slice('stoneflow/'.length)}`
}

function keyFromPublicUrl(config: ReleaseRemoteConfig, url: string) {
	const prefix = `${config.publicUrl.replace(/\/$/, '')}/`
	if (!url.startsWith(prefix)) throw new Error(`发布对象 URL 不属于当前公开端点：${url}`)
	const relativeKey = url.slice(prefix.length)
	if (!relativeKey || relativeKey.startsWith('/') || relativeKey.includes('..')) {
		throw new Error(`发布对象 URL 非法：${url}`)
	}
	return `stoneflow/${relativeKey}`
}

function assertObjectKeys(value: unknown, expected: readonly string[], owner: string) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${owner} 必须是 JSON object`)
	}
	const actual = Object.keys(value).sort()
	const wanted = [...expected].sort()
	if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
		throw new Error(`${owner} 字段不符合发布协议`)
	}
}

function assertArtifactReference<T>(
	value: T,
	owner: string,
): asserts value is T & { url: string; sha256: string } {
	if (!value || typeof value !== 'object') throw new Error(`${owner} 必须是 artifact reference`)
	const reference = value as { url?: unknown; sha256?: unknown }
	if (
		typeof reference.url !== 'string' ||
		!reference.url.trim() ||
		typeof reference.sha256 !== 'string' ||
		!SHA256_PATTERN.test(reference.sha256)
	) {
		throw new Error(`${owner} URL 或 SHA-256 非法`)
	}
}

function assertReferenceNamespace(
	reference: { url: string; sha256: string },
	expectedPrefix: string,
	owner: string,
) {
	const prefix = `${expectedPrefix}/${reference.sha256}/`
	const fileName = reference.url.startsWith(prefix) ? reference.url.slice(prefix.length) : ''
	if (!fileName || fileName.includes('/') || fileName.includes('?') || fileName.includes('#')) {
		throw new Error(`${owner} 不属于当前 release namespace`)
	}
}

function validatePlatformRecord(record: PlatformReleaseRecord, config: ReleaseRemoteConfig) {
	assertObjectKeys(
		record,
		[
			'schemaVersion',
			'channel',
			'version',
			'commit',
			'sourceVersion',
			'platform',
			'updater',
			'downloads',
		],
		'platform release record',
	)
	if (record.schemaVersion !== 1) throw new Error('platform release record schemaVersion 非法')
	if (record.channel !== 'stable' && record.channel !== 'beta') {
		throw new Error('platform release record channel 非法')
	}
	compareChangelogVersions(record.version, record.version)
	if ((record.channel === 'beta') !== record.version.includes('-beta.')) {
		throw new Error('platform release record 版本与渠道不一致')
	}
	if (!COMMIT_PATTERN.test(record.commit)) throw new Error('platform release record commit 非法')
	if (!STABLE_VERSION_PATTERN.test(record.sourceVersion)) {
		throw new Error('platform release record sourceVersion 非法')
	}
	if (!/^(darwin|windows|linux)-[^/]+$/.test(record.platform)) {
		throw new Error('platform release record platform 非法')
	}

	assertObjectKeys(record.updater, ['url', 'signature', 'sha256'], 'record updater')
	assertArtifactReference(record.updater, 'record updater')
	if (typeof record.updater.signature !== 'string' || !record.updater.signature.trim()) {
		throw new Error('record updater 签名为空')
	}
	const baseUrl = config.publicUrl.replace(/\/$/, '')
	assertReferenceNamespace(
		record.updater,
		`${baseUrl}/updates/${record.channel}/releases/${record.version}/platforms/${record.platform}/artifacts`,
		'record updater',
	)
	if (!Array.isArray(record.downloads)) throw new Error('record downloads 必须是 array')
	for (const [index, download] of record.downloads.entries()) {
		assertObjectKeys(download, ['kind', 'url', 'sha256'], `record download ${index}`)
		assertArtifactReference(download, `record download ${index}`)
		if (!['dmg', 'nsis', 'msi', 'appimage'].includes(download.kind)) {
			throw new Error(`record download ${index} kind 非法`)
		}
		if (download.url === record.updater.url && download.sha256 === record.updater.sha256) continue
		assertReferenceNamespace(
			download,
			`${baseUrl}/downloads/${record.channel}/${record.platform}/${record.version}`,
			`record download ${index}`,
		)
	}
}

async function readAndValidateLocalArtifact(item: ImmutableArtifactUpload) {
	const bytes = await readFile(item.filePath)
	if (sha256(bytes) !== item.sha256) {
		throw new Error(`本地产物摘要已变化：${item.key}`)
	}
	if (!item.key.includes(`/${item.sha256}/`)) {
		throw new Error(`产物 key 未使用声明的 SHA-256：${item.key}`)
	}
	return bytes
}

async function putImmutableBytes(input: {
	client: S3ObjectClient
	config: ReleaseRemoteConfig
	key: string
	bytes: Uint8Array
	sha256: string
}) {
	let putError: unknown
	try {
		await putRemoteObject(input.client, {
			bucket: input.config.bucket,
			key: input.key,
			body: input.bytes,
			contentType: 'application/octet-stream',
			cacheControl: IMMUTABLE_CACHE_CONTROL,
			ifNoneMatch: '*',
		})
	} catch (error) {
		putError = error
	}
	const remote = await getRemoteObject(input.client, input.config.bucket, input.key)
	if (remote && sha256(remote.bytes) === input.sha256) return
	if (putError) throw putError
	throw new Error(`S3 不可变产物摘要不一致：${input.key}`)
}

async function putImmutableJson(input: {
	client: S3ObjectClient
	config: ReleaseRemoteConfig
	key: string
	value: unknown
}) {
	const bytes = serializeJson(input.value)
	let putError: unknown
	try {
		await putRemoteObject(input.client, {
			bucket: input.config.bucket,
			key: input.key,
			body: bytes,
			contentType: 'application/json',
			cacheControl: IMMUTABLE_CACHE_CONTROL,
			ifNoneMatch: '*',
		})
	} catch (error) {
		putError = error
	}
	const remote = await getRemoteObject(input.client, input.config.bucket, input.key)
	if (remote) {
		assertJsonEquals(remote.bytes, input.value, `S3 不可变 JSON ${input.key}`)
		return
	}
	if (putError) throw putError
	throw new Error(`S3 不可变 JSON 写入后缺失：${input.key}`)
}

export async function publishArtifactsAndRecord({
	client,
	config,
	uploadItems,
	record,
	fetchArtifactSha256 = defaultFetchArtifactSha256,
}: {
	client: S3ObjectClient
	config: ReleaseRemoteConfig
	uploadItems: readonly ImmutableArtifactUpload[]
	record: PlatformReleaseRecord
	fetchArtifactSha256?: FetchArtifactSha256
}) {
	validatePlatformRecord(record, config)
	const referencedArtifacts = new Set(
		[record.updater, ...record.downloads].map((item) => `${item.sha256}\0${item.url}`),
	)
	const seenKeys = new Set<string>()
	const localArtifacts: Array<{ item: ImmutableArtifactUpload; bytes: Uint8Array }> = []
	for (const item of uploadItems) {
		if (seenKeys.has(item.key)) throw new Error(`重复产物 key：${item.key}`)
		seenKeys.add(item.key)
		if (item.url !== expectedPublicUrl(config, item.key)) {
			throw new Error(`产物 URL 与 key 不一致：${item.key}`)
		}
		if (!referencedArtifacts.delete(`${item.sha256}\0${item.url}`)) {
			throw new Error(`platform record 未引用产物：${item.key}`)
		}
		localArtifacts.push({ item, bytes: await readAndValidateLocalArtifact(item) })
	}
	if (referencedArtifacts.size > 0) throw new Error('platform record 引用了未上传的产物')

	for (const { item, bytes } of localArtifacts) {
		await putImmutableBytes({
			client,
			config,
			key: item.key,
			bytes,
			sha256: item.sha256,
		})
	}
	for (const { item } of localArtifacts) {
		if ((await fetchArtifactSha256(item.url)) !== item.sha256) {
			throw new Error(`公开产物摘要不一致：${item.url}`)
		}
	}

	await putImmutableJson({
		client,
		config,
		key: platformReleaseJsonKey(record.channel, record.version, record.platform),
		value: record,
	})
}

/**
 * 读取并验证既有平台发布事实；返回后可安全跳过不可复现的签名构建。
 */
export async function readPublishedPlatformRecord({
	client,
	config,
	channel,
	version,
	commit,
	sourceVersion,
	platformKey,
	updaterPublicKey,
	verifierRepoRoot,
	fetchArtifactSha256 = defaultFetchArtifactSha256,
}: {
	client: S3ObjectClient
	config: ReleaseRemoteConfig
	channel: ReleaseChannel
	version: string
	commit: string
	sourceVersion: string
	platformKey: string
	updaterPublicKey: string
	verifierRepoRoot: string
	fetchArtifactSha256?: FetchArtifactSha256
}): Promise<PlatformReleaseRecord | null> {
	const key = platformReleaseJsonKey(channel, version, platformKey)
	const remote = await getRemoteObject(client, config.bucket, key)
	if (!remote) return null

	const record = parseJson(remote.bytes, 'immutable platform record') as PlatformReleaseRecord
	validatePlatformRecord(record, config)
	if (
		record.channel !== channel ||
		record.version !== version ||
		record.commit !== commit ||
		record.sourceVersion !== sourceVersion ||
		record.platform !== platformKey
	) {
		throw new Error('既有 immutable platform record 与当前发布身份不一致')
	}

	const references = new Map(
		[record.updater, ...record.downloads].map((item) => [item.url, item.sha256] as const),
	)
	let updaterBytes: Uint8Array | undefined
	for (const [url, expectedSha256] of references) {
		const artifactKey = keyFromPublicUrl(config, url)
		const artifact = await getRemoteObject(client, config.bucket, artifactKey)
		if (!artifact || sha256(artifact.bytes) !== expectedSha256) {
			throw new Error(`既有 immutable platform record 引用的 S3 产物摘要不一致：${url}`)
		}
		if ((await fetchArtifactSha256(url)) !== expectedSha256) {
			throw new Error(`既有 immutable platform record 引用的公开产物摘要不一致：${url}`)
		}
		if (url === record.updater.url) updaterBytes = artifact.bytes
	}
	if (!updaterBytes) throw new Error('既有 immutable platform record 缺少 updater 产物')
	await verifyUpdaterSignatureBytes({
		repoRoot: verifierRepoRoot,
		artifactBytes: updaterBytes,
		signature: record.updater.signature,
		publicKey: updaterPublicKey,
	})

	return record
}

function validatePointer(
	pointer: LatestJson,
	channel: ReleaseChannel,
	platformKey: string,
	strictShape: boolean,
) {
	if (strictShape) assertObjectKeys(pointer, ['version', 'platforms'], 'Pointer')
	compareChangelogVersions(pointer.version, pointer.version)
	const beta = pointer.version.includes('-beta.')
	if ((channel === 'beta') !== beta) throw new Error('Pointer 版本与渠道不一致')
	const platformKeys = Object.keys(pointer.platforms)
	if (platformKeys.length !== 1 || platformKeys[0] !== platformKey) {
		throw new Error(`Pointer 必须仅包含平台 ${platformKey}`)
	}
	const platform = pointer.platforms[platformKey]
	if (strictShape) assertObjectKeys(platform, ['url', 'signature'], `Pointer 平台 ${platformKey}`)
	if (!platform?.url.trim() || !platform.signature.trim()) {
		throw new Error(`Pointer 平台 ${platformKey} 缺少 URL 或签名`)
	}
}

function readRemotePointer(
	remote: RemoteObject | null,
	channel: ReleaseChannel,
	platformKey: string,
) {
	if (!remote) return null
	const value = parseJson(remote.bytes, '远端 Pointer')
	if (!value || typeof value !== 'object') throw new Error('远端 Pointer 必须是 JSON object')
	const pointer = value as LatestJson
	validatePointer(pointer, channel, platformKey, false)
	return { ...remote, pointer }
}

async function verifyPointer(input: {
	client: S3ObjectClient
	config: ReleaseRemoteConfig
	key: string
	url: string
	pointer: LatestJson
	fetchBytes: FetchBytes
}) {
	const remote = await getRemoteObject(input.client, input.config.bucket, input.key)
	if (!remote) throw new Error('Pointer 写入后在 S3 缺失')
	assertJsonEquals(remote.bytes, input.pointer, 'S3 Pointer')
	assertJsonEquals(await input.fetchBytes(input.url), input.pointer, '公开 Pointer')
}

function classifyPointer(current: ReturnType<typeof readRemotePointer>, target: LatestJson) {
	if (!current) return 'write' as const
	const order = compareChangelogVersions(current.pointer.version, target.version)
	if (order > 0) throw new Error('拒绝回退平台 Pointer')
	if (order === 0) {
		if (canonicalJson(current.pointer) === canonicalJson(target)) return 'equal' as const
		throw new Error('同版本平台 Pointer payload 冲突')
	}
	return 'write' as const
}

export async function advancePlatformPointer({
	client,
	config,
	channel,
	platformKey,
	pointer,
	fetchBytes = defaultFetchBytes,
}: {
	client: S3ObjectClient
	config: ReleaseRemoteConfig
	channel: ReleaseChannel
	platformKey: string
	pointer: LatestJson
	fetchBytes?: FetchBytes
}) {
	validatePointer(pointer, channel, platformKey, true)
	const key = platformLatestJsonKey(channel, platformKey)
	const url = platformLatestJsonUrl(config.publicUrl, channel, platformKey)
	const recordKey = platformReleaseJsonKey(channel, pointer.version, platformKey)
	const recordObject = await getRemoteObject(client, config.bucket, recordKey)
	if (!recordObject) throw new Error(`缺少 immutable platform record：${recordKey}`)
	const record = parseJson(recordObject.bytes, 'immutable platform record') as PlatformReleaseRecord
	validatePlatformRecord(record, config)
	if (
		record.channel !== channel ||
		record.version !== pointer.version ||
		record.platform !== platformKey ||
		record.updater.url !== pointer.platforms[platformKey]!.url ||
		record.updater.signature !== pointer.platforms[platformKey]!.signature
	) {
		throw new Error('Pointer 与 immutable platform record 身份不一致')
	}
	const body = serializeJson(pointer)
	let current = readRemotePointer(
		await getRemoteObject(client, config.bucket, key),
		channel,
		platformKey,
	)

	for (let attempt = 0; attempt <= MAX_POINTER_RETRIES; attempt += 1) {
		if (classifyPointer(current, pointer) === 'equal') {
			await verifyPointer({ client, config, key, url, pointer, fetchBytes })
			return
		}

		let result: 'written' | 'conflict'
		try {
			result = await putRemoteObject(client, {
				bucket: config.bucket,
				key,
				body,
				contentType: 'application/json',
				cacheControl: POINTER_CACHE_CONTROL,
				...(current ? { ifMatch: current.etag } : { ifNoneMatch: '*' as const }),
			})
		} catch (error) {
			current = readRemotePointer(
				await getRemoteObject(client, config.bucket, key),
				channel,
				platformKey,
			)
			if (classifyPointer(current, pointer) === 'equal') {
				await verifyPointer({ client, config, key, url, pointer, fetchBytes })
				return
			}
			throw error
		}

		current = readRemotePointer(
			await getRemoteObject(client, config.bucket, key),
			channel,
			platformKey,
		)
		if (result === 'written') {
			if (classifyPointer(current, pointer) !== 'equal') {
				throw new Error('Pointer 条件写成功但读回内容不一致')
			}
			await verifyPointer({ client, config, key, url, pointer, fetchBytes })
			return
		}
		if (classifyPointer(current, pointer) === 'equal') {
			await verifyPointer({ client, config, key, url, pointer, fetchBytes })
			return
		}
	}

	throw new Error('Pointer CAS 冲突超过三次重试上限')
}
