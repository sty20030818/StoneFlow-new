import { afterEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

import { createLatestJson, createPlatformReleaseRecord } from './manifest'
import {
	platformLatestJsonKey,
	platformLatestJsonUrl,
	platformReleaseArtifactKey,
	platformReleaseJsonKey,
} from './paths'
import {
	advancePlatformPointer,
	PUBLIC_ARTIFACT_TIMEOUT_MS,
	publishArtifactsAndRecord,
	readPublishedPlatformRecord,
} from './platform-release'
import type { ReleaseRemoteConfig, S3ObjectClient } from './remote'
import { OTHER_UPDATER_SIGNER, TEST_UPDATER_SIGNER } from './signature-test-fixture'
import type { ImmutableArtifactUpload, LatestJson } from './types'

const tempDirs: string[] = []
const VERIFIER_REPO_ROOT = path.resolve(import.meta.dir, '../..')
const config: ReleaseRemoteConfig = {
	publicUrl: 'https://release.example/stoneflow',
	bucket: 'release-bucket',
	endpoint: 'https://account.r2.cloudflarestorage.com',
}

function sha256(bytes: Uint8Array) {
	return createHash('sha256').update(bytes).digest('hex')
}

function jsonBytes(value: unknown) {
	return Buffer.from(`${JSON.stringify(value, null, 2)}\n`)
}

function objectUrl(key: string) {
	const relativeKey = key.startsWith('stoneflow/') ? key.slice('stoneflow/'.length) : key
	return `${config.publicUrl}/${relativeKey}`
}

function httpError(status: number) {
	return Object.assign(new Error(`HTTP ${status}`), {
		$metadata: { httpStatusCode: status },
	})
}

async function commandBodyBytes(body: unknown) {
	if (typeof body === 'string') return Buffer.from(body)
	if (body instanceof Uint8Array) return Buffer.from(body)
	throw new Error(`测试 S3 fake 不支持 Body: ${typeof body}`)
}

interface StoredObject {
	bytes: Buffer
	etag: string
}

interface PutFailure {
	status: number
	mutate?: (input: PutObjectCommand['input']) => Promise<void> | void
}

class MemoryS3 {
	readonly objects = new Map<string, StoredObject>()
	readonly events: string[]
	readonly putCommands: PutObjectCommand[] = []
	readonly getCommands: GetObjectCommand[] = []
	readonly #putFailures = new Map<string, PutFailure[]>()
	#etagSequence = 0

	constructor(events: string[] = []) {
		this.events = events
	}

	client() {
		return this as unknown as S3ObjectClient
	}

	seed(key: string, bytes: Uint8Array, etag = 'W/"opaque-seed,multipart-2"') {
		this.objects.set(key, { bytes: Buffer.from(bytes), etag })
	}

	queuePutFailure(key: string, failure: PutFailure) {
		const failures = this.#putFailures.get(key) ?? []
		failures.push(failure)
		this.#putFailures.set(key, failures)
	}

	async send(command: GetObjectCommand | PutObjectCommand): Promise<unknown> {
		if (command instanceof GetObjectCommand) {
			this.getCommands.push(command)
			const key = command.input.Key!
			this.events.push(`s3:get:${key}`)
			const object = this.objects.get(key)
			if (!object) throw httpError(404)
			return {
				Body: {
					transformToByteArray: async () => Buffer.from(object.bytes),
				},
				ETag: object.etag,
			}
		}

		if (command instanceof PutObjectCommand) {
			this.putCommands.push(command)
			const key = command.input.Key!
			this.events.push(`s3:put:${key}`)
			const queued = this.#putFailures.get(key)?.shift()
			if (queued) {
				await queued.mutate?.(command.input)
				throw httpError(queued.status)
			}

			const current = this.objects.get(key)
			if (command.input.IfNoneMatch === '*' && current) throw httpError(412)
			if (command.input.IfMatch !== undefined && current?.etag !== command.input.IfMatch) {
				throw httpError(412)
			}
			if (command.input.IfMatch !== undefined && !current) throw httpError(412)

			const bytes = await commandBodyBytes(command.input.Body)
			const etag = `W/"opaque-write-${++this.#etagSequence},multipart-3"`
			this.objects.set(key, { bytes, etag })
			return { ETag: etag }
		}

		throw new Error('测试 S3 fake 收到非 GetObject/PutObject command')
	}
}

function publicReader(objects: Map<string, Uint8Array>, events: string[]) {
	return async (url: string) => {
		events.push(`public:get:${url}`)
		const bytes = objects.get(url)
		if (!bytes) throw new Error(`公开对象不存在: ${url}`)
		return Buffer.from(bytes)
	}
}

function publicDigestReader(objects: Map<string, Uint8Array>, events: string[]) {
	const read = publicReader(objects, events)
	return async (url: string) => sha256(await read(url))
}

function streamedResponse(bytes: Uint8Array, status = 200) {
	const middle = Math.ceil(bytes.byteLength / 2)
	return {
		ok: status >= 200 && status < 300,
		status,
		body: new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(bytes.slice(0, middle))
				controller.enqueue(bytes.slice(middle))
				controller.close()
			},
		}),
	} as Response
}

async function createPlatformFixture() {
	const root = await mkdtemp(path.join(tmpdir(), 'stoneflow-platform-release-'))
	tempDirs.push(root)
	const channel = 'beta' as const
	const version = '0.1.4-beta.4'
	const platform = 'darwin-aarch64'
	const updaterBytes = Buffer.from('signed updater bytes')
	const downloadBytes = Buffer.from('signed dmg bytes')
	const updaterSha = sha256(updaterBytes)
	const downloadSha = sha256(downloadBytes)
	const updaterName = `StoneFlow_${version}_aarch64.app.tar.gz`
	const downloadName = `StoneFlow_${version}_aarch64.dmg`
	const updaterKey = platformReleaseArtifactKey(channel, version, platform, updaterSha, updaterName)
	const downloadKey = `stoneflow/downloads/${channel}/${platform}/${version}/${downloadSha}/${downloadName}`
	const updaterPath = path.join(root, updaterName)
	const downloadPath = path.join(root, downloadName)
	await writeFile(updaterPath, updaterBytes)
	await writeFile(downloadPath, downloadBytes)
	const uploadItems: ImmutableArtifactUpload[] = [
		{
			filePath: updaterPath,
			key: updaterKey,
			url: objectUrl(updaterKey),
			sha256: updaterSha,
		},
		{
			filePath: downloadPath,
			key: downloadKey,
			url: objectUrl(downloadKey),
			sha256: downloadSha,
		},
	]
	const record = createPlatformReleaseRecord({
		channel,
		version,
		commit: 'a'.repeat(40),
		sourceVersion: '0.1.3',
		platform,
		updater: {
			url: objectUrl(updaterKey),
			signature: TEST_UPDATER_SIGNER.sign(updaterName, updaterBytes),
			sha256: updaterSha,
		},
		downloads: [{ kind: 'dmg', url: objectUrl(downloadKey), sha256: downloadSha }],
	})

	return {
		channel,
		version,
		platform,
		updaterBytes,
		downloadBytes,
		updaterKey,
		downloadKey,
		uploadItems,
		record,
		recordKey: platformReleaseJsonKey(channel, version, platform),
	}
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('publishArtifactsAndRecord', () => {
	test('默认公开读回流式计算大产物摘要，并以五分钟为总超时上限', async () => {
		const fixture = await createPlatformFixture()
		const s3 = new MemoryS3()
		const publicObjects = new Map<string, Uint8Array>([
			[fixture.record.updater.url, fixture.updaterBytes],
			[fixture.record.downloads[0]!.url, fixture.downloadBytes],
		])
		const originalFetch = globalThis.fetch
		globalThis.fetch = (async (input) => {
			const url = String(input)
			const bytes = publicObjects.get(url)
			return bytes ? streamedResponse(bytes) : streamedResponse(new Uint8Array(), 404)
		}) as typeof fetch

		try {
			expect(PUBLIC_ARTIFACT_TIMEOUT_MS).toBe(300_000)
			await publishArtifactsAndRecord({
				client: s3.client(),
				config,
				uploadItems: fixture.uploadItems,
				record: fixture.record,
			})
			await expect(
				readPublishedPlatformRecord({
					client: s3.client(),
					config,
					channel: fixture.channel,
					version: fixture.version,
					commit: fixture.record.commit,
					sourceVersion: fixture.record.sourceVersion,
					platformKey: fixture.platform,
					updaterPublicKey: TEST_UPDATER_SIGNER.publicKey,
					verifierRepoRoot: VERIFIER_REPO_ROOT,
				}),
			).resolves.toEqual(fixture.record)
		} finally {
			globalThis.fetch = originalFetch
		}
	})

	test('默认公开读回遇到非成功响应时 fail closed 且不写 record', async () => {
		const fixture = await createPlatformFixture()
		const s3 = new MemoryS3()
		const originalFetch = globalThis.fetch
		globalThis.fetch = (async () =>
			streamedResponse(new Uint8Array(), 503)) as unknown as typeof fetch

		try {
			await expect(
				publishArtifactsAndRecord({
					client: s3.client(),
					config,
					uploadItems: fixture.uploadItems,
					record: fixture.record,
				}),
			).rejects.toThrow('HTTP 503')
			expect(s3.objects.has(fixture.recordKey)).toBeFalse()
		} finally {
			globalThis.fetch = originalFetch
		}
	})

	test('全部 artifact 通过 S3 与公开 SHA 校验后才以不可变 record 提交，并且绝不触碰 Pointer', async () => {
		const fixture = await createPlatformFixture()
		const events: string[] = []
		const s3 = new MemoryS3(events)
		const publicObjects = new Map<string, Uint8Array>([
			[fixture.record.updater.url, fixture.updaterBytes],
			[fixture.record.downloads[0]!.url, fixture.downloadBytes],
		])

		await publishArtifactsAndRecord({
			client: s3.client(),
			config,
			uploadItems: fixture.uploadItems,
			record: fixture.record,
			fetchArtifactSha256: publicDigestReader(publicObjects, events),
		})

		const recordPut = events.indexOf(`s3:put:${fixture.recordKey}`)
		const recordReadback = events.lastIndexOf(`s3:get:${fixture.recordKey}`)
		for (const [key, url] of [
			[fixture.updaterKey, fixture.record.updater.url],
			[fixture.downloadKey, fixture.record.downloads[0]!.url],
		] as const) {
			const artifactPut = events.indexOf(`s3:put:${key}`)
			const artifactReadback = events.indexOf(`s3:get:${key}`)
			const publicReadback = events.indexOf(`public:get:${url}`)
			expect(artifactPut).toBeGreaterThanOrEqual(0)
			expect(artifactReadback).toBeGreaterThan(artifactPut)
			expect(publicReadback).toBeGreaterThan(artifactReadback)
			expect(recordPut).toBeGreaterThan(publicReadback)
		}
		expect(recordReadback).toBeGreaterThan(recordPut)
		expect(events.some((event) => event.includes('/latest.json'))).toBeFalse()

		const putByKey = new Map(s3.putCommands.map((command) => [command.input.Key, command.input]))
		for (const key of [fixture.updaterKey, fixture.downloadKey, fixture.recordKey]) {
			expect(putByKey.get(key)).toMatchObject({
				Bucket: config.bucket,
				Key: key,
				IfNoneMatch: '*',
				CacheControl: 'public, max-age=31536000, immutable',
			})
		}
		expect(putByKey.get(fixture.updaterKey)!.ContentType).toBe('application/octet-stream')
		expect(putByKey.get(fixture.downloadKey)!.ContentType).toBe('application/octet-stream')
		expect(putByKey.get(fixture.recordKey)!.ContentType).toBe('application/json')
		expect(JSON.parse(s3.objects.get(fixture.recordKey)!.bytes.toString())).toEqual(fixture.record)
	})

	test('S3 artifact readback 摘要不符时停止且不写 record', async () => {
		const fixture = await createPlatformFixture()
		const s3 = new MemoryS3()
		s3.seed(fixture.updaterKey, Buffer.from('corrupt remote artifact'))
		const publicObjects = new Map<string, Uint8Array>([
			[fixture.record.updater.url, fixture.updaterBytes],
			[fixture.record.downloads[0]!.url, fixture.downloadBytes],
		])

		await expect(
			publishArtifactsAndRecord({
				client: s3.client(),
				config,
				uploadItems: fixture.uploadItems,
				record: fixture.record,
				fetchArtifactSha256: publicDigestReader(publicObjects, s3.events),
			}),
		).rejects.toThrow()
		expect(s3.putCommands.some((command) => command.input.Key === fixture.recordKey)).toBeFalse()
		expect(s3.objects.has(fixture.recordKey)).toBeFalse()
	})

	test('公开 artifact 摘要不符时停止且不写 record', async () => {
		const fixture = await createPlatformFixture()
		const s3 = new MemoryS3()
		const publicObjects = new Map<string, Uint8Array>([
			[fixture.record.updater.url, Buffer.from('stale CDN updater')],
			[fixture.record.downloads[0]!.url, fixture.downloadBytes],
		])

		await expect(
			publishArtifactsAndRecord({
				client: s3.client(),
				config,
				uploadItems: fixture.uploadItems,
				record: fixture.record,
				fetchArtifactSha256: publicDigestReader(publicObjects, s3.events),
			}),
		).rejects.toThrow()
		expect(s3.putCommands.some((command) => command.input.Key === fixture.recordKey)).toBeFalse()
	})

	test('已存在的相同 artifacts 与结构等价 record 可幂等复用，异 record 不可覆盖', async () => {
		const fixture = await createPlatformFixture()
		const publicObjects = new Map<string, Uint8Array>([
			[fixture.record.updater.url, fixture.updaterBytes],
			[fixture.record.downloads[0]!.url, fixture.downloadBytes],
		])
		const s3 = new MemoryS3()
		s3.seed(fixture.updaterKey, fixture.updaterBytes)
		s3.seed(fixture.downloadKey, fixture.downloadBytes)
		s3.seed(fixture.recordKey, Buffer.from(JSON.stringify(fixture.record)))

		await expect(
			publishArtifactsAndRecord({
				client: s3.client(),
				config,
				uploadItems: fixture.uploadItems,
				record: fixture.record,
				fetchArtifactSha256: publicDigestReader(publicObjects, s3.events),
			}),
		).resolves.toBeUndefined()

		const conflict = new MemoryS3()
		conflict.seed(fixture.updaterKey, fixture.updaterBytes)
		conflict.seed(fixture.downloadKey, fixture.downloadBytes)
		conflict.seed(fixture.recordKey, jsonBytes({ ...fixture.record, commit: 'b'.repeat(40) }))
		await expect(
			publishArtifactsAndRecord({
				client: conflict.client(),
				config,
				uploadItems: fixture.uploadItems,
				record: fixture.record,
				fetchArtifactSha256: publicDigestReader(publicObjects, conflict.events),
			}),
		).rejects.toThrow()
		expect(JSON.parse(conflict.objects.get(fixture.recordKey)!.bytes.toString()).commit).toBe(
			'b'.repeat(40),
		)
	})

	test('拒绝把其它版本或平台 namespace 的产物写入当前 immutable record', async () => {
		const fixture = await createPlatformFixture()
		const s3 = new MemoryS3()
		const mismatchedRecord = {
			...fixture.record,
			version: '0.1.4-beta.5',
			platform: 'windows-x86_64',
		}

		await expect(
			publishArtifactsAndRecord({
				client: s3.client(),
				config,
				uploadItems: fixture.uploadItems,
				record: mismatchedRecord,
				fetchArtifactSha256: publicDigestReader(new Map(), s3.events),
			}),
		).rejects.toThrow('namespace')
		expect(s3.putCommands).toHaveLength(0)
	})
})

describe('readPublishedPlatformRecord', () => {
	test('既有 record 的真实 minisign、身份和引用产物均一致时可跳过构建', async () => {
		const fixture = await createPlatformFixture()
		const s3 = new MemoryS3()
		s3.seed(fixture.recordKey, jsonBytes(fixture.record))
		s3.seed(fixture.updaterKey, fixture.updaterBytes)
		s3.seed(fixture.downloadKey, fixture.downloadBytes)
		const publicObjects = new Map<string, Uint8Array>([
			[fixture.record.updater.url, fixture.updaterBytes],
			[fixture.record.downloads[0]!.url, fixture.downloadBytes],
		])

		await expect(
			readPublishedPlatformRecord({
				client: s3.client(),
				config,
				channel: fixture.channel,
				version: fixture.version,
				commit: fixture.record.commit,
				sourceVersion: fixture.record.sourceVersion,
				platformKey: fixture.platform,
				updaterPublicKey: TEST_UPDATER_SIGNER.publicKey,
				verifierRepoRoot: VERIFIER_REPO_ROOT,
				fetchArtifactSha256: publicDigestReader(publicObjects, s3.events),
			}),
		).resolves.toEqual(fixture.record)
		expect(s3.putCommands).toHaveLength(0)
	})

	test('record 不存在时返回 null，身份或签名不一致时拒绝复用', async () => {
		const fixture = await createPlatformFixture()
		const s3 = new MemoryS3()
		const input = {
			client: s3.client(),
			config,
			channel: fixture.channel,
			version: fixture.version,
			commit: fixture.record.commit,
			sourceVersion: fixture.record.sourceVersion,
			platformKey: fixture.platform,
			updaterPublicKey: TEST_UPDATER_SIGNER.publicKey,
			verifierRepoRoot: VERIFIER_REPO_ROOT,
			fetchArtifactSha256: publicDigestReader(new Map(), s3.events),
		} as const

		await expect(readPublishedPlatformRecord(input)).resolves.toBeNull()
		s3.seed(fixture.recordKey, jsonBytes({ ...fixture.record, commit: 'b'.repeat(40) }))
		await expect(readPublishedPlatformRecord(input)).rejects.toThrow('发布身份不一致')
		s3.seed(
			fixture.recordKey,
			jsonBytes({ ...fixture.record, updater: { ...fixture.record.updater, signature: '' } }),
		)
		await expect(readPublishedPlatformRecord(input)).rejects.toThrow('签名为空')
	})

	test('既有 record 引用的 S3 或公开产物摘要不一致时拒绝跳过构建', async () => {
		const fixture = await createPlatformFixture()
		const s3 = new MemoryS3()
		s3.seed(fixture.recordKey, jsonBytes(fixture.record))
		s3.seed(fixture.updaterKey, Buffer.from('corrupt'))
		s3.seed(fixture.downloadKey, fixture.downloadBytes)
		const input = {
			client: s3.client(),
			config,
			channel: fixture.channel,
			version: fixture.version,
			commit: fixture.record.commit,
			sourceVersion: fixture.record.sourceVersion,
			platformKey: fixture.platform,
			updaterPublicKey: TEST_UPDATER_SIGNER.publicKey,
			verifierRepoRoot: VERIFIER_REPO_ROOT,
		} as const

		await expect(
			readPublishedPlatformRecord({
				...input,
				fetchArtifactSha256: publicDigestReader(new Map(), s3.events),
			}),
		).rejects.toThrow('S3 产物摘要不一致')

		s3.seed(fixture.updaterKey, fixture.updaterBytes)
		await expect(
			readPublishedPlatformRecord({
				...input,
				fetchArtifactSha256: publicDigestReader(
					new Map([
						[fixture.record.updater.url, Buffer.from('stale public bytes')],
						[fixture.record.downloads[0]!.url, fixture.downloadBytes],
					]),
					s3.events,
				),
			}),
		).rejects.toThrow('公开产物摘要不一致')
	})

	test('既有 record 的签名不属于当前公钥或不匹配精确 updater bytes 时拒绝复用', async () => {
		const fixture = await createPlatformFixture()
		const s3 = new MemoryS3()
		s3.seed(fixture.updaterKey, fixture.updaterBytes)
		s3.seed(fixture.downloadKey, fixture.downloadBytes)
		const publicObjects = new Map<string, Uint8Array>([
			[fixture.record.updater.url, fixture.updaterBytes],
			[fixture.record.downloads[0]!.url, fixture.downloadBytes],
		])

		for (const signature of [
			OTHER_UPDATER_SIGNER.sign(path.basename(fixture.record.updater.url), fixture.updaterBytes),
			TEST_UPDATER_SIGNER.sign(
				path.basename(fixture.record.updater.url),
				Buffer.from('other updater bytes'),
			),
		]) {
			const record = {
				...fixture.record,
				updater: { ...fixture.record.updater, signature },
			}
			s3.seed(fixture.recordKey, jsonBytes(record))
			await expect(
				readPublishedPlatformRecord({
					client: s3.client(),
					config,
					channel: fixture.channel,
					version: fixture.version,
					commit: record.commit,
					sourceVersion: record.sourceVersion,
					platformKey: fixture.platform,
					updaterPublicKey: TEST_UPDATER_SIGNER.publicKey,
					verifierRepoRoot: VERIFIER_REPO_ROOT,
					fetchArtifactSha256: publicDigestReader(publicObjects, s3.events),
				}),
			).rejects.toThrow('updater 产物验签失败')
		}
		expect(s3.putCommands).toHaveLength(0)
	})
})

function pointerFixture(version = '0.1.4-beta.4') {
	const channel = 'beta' as const
	const platformKey = 'windows-x86_64'
	const updaterSha = 'c'.repeat(64)
	const updater = {
		url: `https://release.example/stoneflow/updates/beta/releases/${version}/platforms/${platformKey}/artifacts/${updaterSha}/StoneFlow_${version}_x64-setup.exe`,
		signature: `signature-${version}`,
		sha256: updaterSha,
	}
	const pointer = createLatestJson({
		version,
		platformKey,
		updater,
	})
	const record = createPlatformReleaseRecord({
		channel,
		version,
		commit: 'a'.repeat(40),
		sourceVersion: '0.1.3',
		platform: platformKey,
		updater,
		downloads: [{ kind: 'nsis', url: updater.url, sha256: updater.sha256 }],
	})
	return {
		channel,
		platformKey,
		pointer,
		record,
		recordKey: platformReleaseJsonKey(channel, version, platformKey),
		key: platformLatestJsonKey(channel, platformKey),
		url: platformLatestJsonUrl(config.publicUrl, channel, platformKey),
	}
}

async function advance(input: { s3: MemoryS3; pointer: LatestJson; publicBytes?: Uint8Array }) {
	const identity = pointerFixture(input.pointer.version)
	if (!input.s3.objects.has(identity.recordKey)) {
		input.s3.seed(identity.recordKey, jsonBytes(identity.record))
	}
	const publicObjects = new Map<string, Uint8Array>([
		[identity.url, input.publicBytes ?? jsonBytes(input.pointer)],
	])
	return advancePlatformPointer({
		client: input.s3.client(),
		config,
		channel: identity.channel,
		platformKey: identity.platformKey,
		pointer: input.pointer,
		fetchBytes: publicReader(publicObjects, input.s3.events),
	})
}

describe('advancePlatformPointer', () => {
	test('不存在时用 If-None-Match 创建，并通过控制面与公开 URL 精确读回', async () => {
		const fixture = pointerFixture()
		const s3 = new MemoryS3()

		await advance({ s3, pointer: fixture.pointer })

		expect(s3.putCommands).toHaveLength(1)
		expect(s3.putCommands[0]!.input).toMatchObject({
			Bucket: config.bucket,
			Key: fixture.key,
			IfNoneMatch: '*',
			CacheControl: 'no-cache',
			ContentType: 'application/json',
		})
		expect(s3.putCommands[0]!.input.IfMatch).toBeUndefined()
		expect(s3.objects.get(fixture.key)!.bytes).toEqual(jsonBytes(fixture.pointer))
		expect(s3.events).toContain(`s3:get:${fixture.key}`)
		expect(s3.events.at(-1)).toBe(`public:get:${fixture.url}`)
	})

	test('较低 SemVer 用不透明 ETag 原样 If-Match 前进', async () => {
		const current = pointerFixture('0.1.4-beta.3')
		const target = pointerFixture('0.1.4-beta.4')
		const opaqueEtag = 'W/"opaque,multipart-17-5"'
		const s3 = new MemoryS3()
		s3.seed(current.key, jsonBytes(current.pointer), opaqueEtag)

		await advance({ s3, pointer: target.pointer })

		expect(s3.putCommands).toHaveLength(1)
		expect(s3.putCommands[0]!.input.IfMatch).toBe(opaqueEtag)
		expect(s3.putCommands[0]!.input.IfNoneMatch).toBeUndefined()
		expect(s3.objects.get(target.key)!.bytes).toEqual(jsonBytes(target.pointer))
	})

	test('相同 payload 幂等成功且不写，仍完成公开 pointer 终检', async () => {
		const fixture = pointerFixture()
		const s3 = new MemoryS3()
		s3.seed(fixture.key, jsonBytes(fixture.pointer))

		await advance({ s3, pointer: fixture.pointer })

		expect(s3.putCommands).toHaveLength(0)
		expect(s3.events.at(-1)).toBe(`public:get:${fixture.url}`)
	})

	test('拒绝版本回退与同版本异 payload，且不写 Pointer', async () => {
		const current = pointerFixture('0.1.4-beta.5')
		const rollback = pointerFixture('0.1.4-beta.4')
		const s3 = new MemoryS3()
		s3.seed(current.key, jsonBytes(current.pointer))

		await expect(advance({ s3, pointer: rollback.pointer })).rejects.toThrow()
		expect(s3.putCommands).toHaveLength(0)

		const sameVersionConflict: LatestJson = {
			...current.pointer,
			platforms: {
				[current.platformKey]: {
					...current.pointer.platforms[current.platformKey]!,
					signature: 'different-signature',
				},
			},
		}
		await expect(advance({ s3, pointer: sameVersionConflict })).rejects.toThrow()
		expect(s3.putCommands).toHaveLength(0)
	})

	test('拒绝 Pointer 用当前平台和版本声明引用其它平台或版本的 updater', async () => {
		const fixture = pointerFixture()
		const s3 = new MemoryS3()
		const mismatchedPointer: LatestJson = {
			...fixture.pointer,
			platforms: {
				[fixture.platformKey]: {
					...fixture.pointer.platforms[fixture.platformKey]!,
					url:
						'https://release.example/stoneflow/updates/beta/releases/0.1.4-beta.3/' +
						`platforms/darwin-aarch64/artifacts/${'d'.repeat(64)}/mac.tar.gz`,
				},
			},
		}

		await expect(advance({ s3, pointer: mismatchedPointer })).rejects.toThrow('身份不一致')
		expect(s3.putCommands).toHaveLength(0)
		expect(s3.objects.has(fixture.key)).toBeFalse()
	})

	test('409/412 后重读并重新分类，第三次 CAS 可成功', async () => {
		const current = pointerFixture('0.1.4-beta.3')
		const target = pointerFixture('0.1.4-beta.4')
		const s3 = new MemoryS3()
		s3.seed(current.key, jsonBytes(current.pointer), 'opaque-1')
		s3.queuePutFailure(current.key, {
			status: 409,
			mutate: () => s3.seed(current.key, jsonBytes(current.pointer), 'opaque-2'),
		})
		s3.queuePutFailure(current.key, {
			status: 412,
			mutate: () => s3.seed(current.key, jsonBytes(current.pointer), 'opaque-3'),
		})

		await advance({ s3, pointer: target.pointer })

		expect(s3.putCommands.map((command) => command.input.IfMatch)).toEqual([
			'opaque-1',
			'opaque-2',
			'opaque-3',
		])
		expect(s3.objects.get(target.key)!.bytes).toEqual(jsonBytes(target.pointer))
	})

	test('初次写加三次 CAS retry 均冲突后最终重读，再停止而不盲目覆盖', async () => {
		const current = pointerFixture('0.1.4-beta.3')
		const target = pointerFixture('0.1.4-beta.4')
		const s3 = new MemoryS3()
		s3.seed(current.key, jsonBytes(current.pointer), 'opaque-1')
		for (const [index, status] of [409, 412, 409, 412].entries()) {
			s3.queuePutFailure(current.key, {
				status,
				mutate: () => s3.seed(current.key, jsonBytes(current.pointer), `opaque-${index + 2}`),
			})
		}

		await expect(advance({ s3, pointer: target.pointer })).rejects.toThrow()
		expect(s3.putCommands).toHaveLength(4)
		expect(s3.getCommands).toHaveLength(6)
		expect(s3.objects.get(current.key)!.bytes).toEqual(jsonBytes(current.pointer))
	})

	test('第 4 次条件冲突后最终重读若已是目标 payload，则按赢家结果幂等成功', async () => {
		const current = pointerFixture('0.1.4-beta.3')
		const target = pointerFixture('0.1.4-beta.4')
		const s3 = new MemoryS3()
		s3.seed(current.key, jsonBytes(current.pointer), 'opaque-1')
		for (const [index, status] of [409, 412, 409, 412].entries()) {
			s3.queuePutFailure(current.key, {
				status,
				mutate: () =>
					s3.seed(
						current.key,
						index === 3 ? jsonBytes(target.pointer) : jsonBytes(current.pointer),
						`opaque-${index + 2}`,
					),
			})
		}

		await advance({ s3, pointer: target.pointer })

		expect(s3.putCommands).toHaveLength(4)
		expect(s3.objects.get(target.key)!.bytes).toEqual(jsonBytes(target.pointer))
		expect(s3.events.at(-1)).toBe(`public:get:${target.url}`)
	})

	test('条件写响应丢失后先重读；目标 payload 已落盘时视为成功', async () => {
		const current = pointerFixture('0.1.4-beta.3')
		const target = pointerFixture('0.1.4-beta.4')
		const s3 = new MemoryS3()
		s3.seed(current.key, jsonBytes(current.pointer), 'opaque-old')
		s3.queuePutFailure(current.key, {
			status: 500,
			mutate: async (input) => {
				s3.seed(current.key, await commandBodyBytes(input.Body), 'opaque-written')
			},
		})

		await advance({ s3, pointer: target.pointer })

		expect(s3.putCommands).toHaveLength(1)
		expect(s3.objects.get(target.key)!.bytes).toEqual(jsonBytes(target.pointer))
		expect(s3.events.at(-1)).toBe(`public:get:${target.url}`)
	})

	test('公开 pointer 终检失败只报告失败，不回滚已写入 Pointer', async () => {
		const current = pointerFixture('0.1.4-beta.3')
		const target = pointerFixture('0.1.4-beta.4')
		const s3 = new MemoryS3()
		s3.seed(current.key, jsonBytes(current.pointer), 'opaque-old')

		await expect(
			advance({
				s3,
				pointer: target.pointer,
				publicBytes: jsonBytes(current.pointer),
			}),
		).rejects.toThrow()
		expect(s3.objects.get(target.key)!.bytes).toEqual(jsonBytes(target.pointer))
	})
})
