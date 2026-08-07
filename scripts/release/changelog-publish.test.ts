import { describe, expect, test } from 'bun:test'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

import {
	inspectChangelogCompatibility,
	publishChangelog,
	validatePublishedChangelog,
} from './changelog-publish'
import type { ReleaseRemoteConfig, S3ObjectClient } from './remote'

const CHANGELOG_KEY = 'stoneflow/CHANGELOG.md'
const config: ReleaseRemoteConfig = {
	publicUrl: 'https://release.example/stoneflow',
	bucket: 'release-bucket',
	endpoint: 'https://account.r2.cloudflarestorage.com',
}
const changelogUrl = `${config.publicUrl}/CHANGELOG.md`

interface ReleaseEntry {
	readonly version: string
	readonly body?: string
	readonly date?: string
	readonly yanked?: boolean
}

function changelog(entries: readonly ReleaseEntry[]) {
	return [
		'# Changelog',
		'',
		'StoneFlow 的所有重要变更都会记录在这里。',
		'',
		'## [Unreleased]',
		'',
		...entries.flatMap((entry) => [
			`## [${entry.version}] - ${entry.date ?? '2026-08-06'}${entry.yanked ? ' [YANKED]' : ''}`,
			'',
			'### Changed',
			'',
			`- ${entry.body ?? `Release ${entry.version}`}`,
			'',
		]),
	].join('\n')
}

function httpError(status: number) {
	return Object.assign(new Error(`HTTP ${status}`), {
		$metadata: { httpStatusCode: status },
	})
}

async function bodyBytes(body: unknown) {
	if (typeof body === 'string') return Buffer.from(body)
	if (body instanceof Uint8Array) return Buffer.from(body)
	throw new Error(`测试 S3 fake 不支持 Body: ${typeof body}`)
}

interface StoredObject {
	readonly bytes: Buffer
	readonly etag: string
}

interface PutFailure {
	readonly status: number
	readonly mutate?: () => void
}

class MemoryS3 {
	readonly objects = new Map<string, StoredObject>()
	readonly getCommands: GetObjectCommand[] = []
	readonly putCommands: PutObjectCommand[] = []
	readonly #putFailures: PutFailure[] = []
	#afterPut: (() => void) | undefined
	#etagSequence = 0

	client() {
		return this as unknown as S3ObjectClient
	}

	seed(bytes: Uint8Array | string, etag = 'W/"opaque-seed,multipart-2"') {
		this.objects.set(CHANGELOG_KEY, { bytes: Buffer.from(bytes), etag })
	}

	queuePutFailure(failure: PutFailure) {
		this.#putFailures.push(failure)
	}

	mutateAfterPut(mutate: () => void) {
		this.#afterPut = mutate
	}

	async send(command: GetObjectCommand | PutObjectCommand): Promise<unknown> {
		if (command instanceof GetObjectCommand) {
			this.getCommands.push(command)
			const object = this.objects.get(command.input.Key!)
			if (!object) throw httpError(404)
			return {
				Body: { transformToByteArray: async () => Buffer.from(object.bytes) },
				ETag: object.etag,
			}
		}

		if (command instanceof PutObjectCommand) {
			this.putCommands.push(command)
			const failure = this.#putFailures.shift()
			if (failure) {
				failure.mutate?.()
				throw httpError(failure.status)
			}

			const key = command.input.Key!
			const current = this.objects.get(key)
			if (command.input.IfNoneMatch === '*' && current) throw httpError(412)
			if (command.input.IfMatch !== undefined && current?.etag !== command.input.IfMatch) {
				throw httpError(412)
			}
			if (command.input.IfMatch !== undefined && !current) throw httpError(412)

			this.objects.set(key, {
				bytes: await bodyBytes(command.input.Body),
				etag: `W/"opaque-write-${++this.#etagSequence},multipart-3"`,
			})
			this.#afterPut?.()
			this.#afterPut = undefined
			return {}
		}

		throw new Error('测试 S3 fake 收到非 GetObject/PutObject command')
	}
}

function publicReader(bytes: Uint8Array, reads: string[] = []) {
	return async (url: string) => {
		reads.push(url)
		return Buffer.from(bytes)
	}
}

function publish(input: {
	s3: MemoryS3
	source: string
	targetVersion: string
	releaseKind?: 'claim' | 'reuse'
	publicBytes?: Uint8Array
	publicReads?: string[]
}) {
	return publishChangelog({
		client: input.s3.client(),
		config,
		source: input.source,
		targetVersion: input.targetVersion,
		releaseKind: input.releaseKind ?? 'claim',
		fetchBytes: publicReader(input.publicBytes ?? Buffer.from(input.source), input.publicReads),
	})
}

describe('publishChangelog', () => {
	test('claim 前只读检查远端历史与 YANKED 状态且不写对象', async () => {
		const remote = changelog([{ version: '0.1.3', yanked: true }])
		const source = changelog([{ version: '0.1.4' }, { version: '0.1.3' }])
		const s3 = new MemoryS3()
		s3.seed(remote)

		await expect(
			inspectChangelogCompatibility({
				client: s3.client(),
				config,
				source,
				targetVersion: '0.1.4',
				releaseKind: 'claim',
			}),
		).rejects.toThrow('YANKED')
		expect(s3.putCommands).toHaveLength(0)
	})

	test('远端不存在时用 If-None-Match 上传完整根原文 bytes，并完成双面读回', async () => {
		const source = `\uFEFF${changelog([{ version: '0.1.4-beta.4' }]).replaceAll('\n', '\r\n')}`
		const s3 = new MemoryS3()

		await publish({ s3, source, targetVersion: '0.1.4-beta.4' })

		expect(s3.putCommands).toHaveLength(1)
		expect(s3.putCommands[0]!.input).toMatchObject({
			Bucket: config.bucket,
			Key: CHANGELOG_KEY,
			IfNoneMatch: '*',
			CacheControl: 'no-cache',
		})
		expect(s3.putCommands[0]!.input.IfMatch).toBeUndefined()
		expect(await bodyBytes(s3.putCommands[0]!.input.Body)).toEqual(Buffer.from(source))
		expect(s3.objects.get(CHANGELOG_KEY)!.bytes).toEqual(Buffer.from(source))
		expect(s3.getCommands.length).toBeGreaterThanOrEqual(2)
	})

	test('远端已存在时原样使用 opaque ETag 的 If-Match，并允许修订既有正文', async () => {
		const remote = changelog([{ version: '0.1.3', body: '原正文' }])
		const source = changelog([
			{ version: '0.1.4', body: '新版本' },
			{ version: '0.1.3', body: '受审后的正文修订', date: '2026-08-05' },
		])
		const opaqueEtag = 'W/"opaque,multipart-17-5"'
		const s3 = new MemoryS3()
		s3.seed(remote, opaqueEtag)

		await publish({ s3, source, targetVersion: '0.1.4' })

		expect(s3.putCommands).toHaveLength(1)
		expect(s3.putCommands[0]!.input.IfMatch).toBe(opaqueEtag)
		expect(s3.putCommands[0]!.input.IfNoneMatch).toBeUndefined()
		expect(s3.objects.get(CHANGELOG_KEY)!.bytes).toEqual(Buffer.from(source))
	})

	test('远端与本地 bytes 已相同时不写，仍完成 S3 与公开面校验', async () => {
		const source = changelog([{ version: '0.1.4' }, { version: '0.1.3' }])
		const s3 = new MemoryS3()
		const publicReads: string[] = []
		s3.seed(source)

		await publish({ s3, source, targetVersion: '0.1.4', publicReads })

		expect(s3.putCommands).toHaveLength(0)
		expect(s3.getCommands.length).toBeGreaterThanOrEqual(1)
		expect(publicReads).toEqual([changelogUrl])
	})

	test.each([
		['目标版本不存在', changelog([{ version: '0.1.3' }]), '0.1.4'],
		['目标版本已 YANKED', changelog([{ version: '0.1.4', yanked: true }]), '0.1.4'],
	] as const)('%s 时在上传前阻断', async (_name, source, targetVersion) => {
		const s3 = new MemoryS3()

		await expect(publish({ s3, source, targetVersion })).rejects.toThrow()
		expect(s3.putCommands).toHaveLength(0)
	})

	test('本地缺少任一远端版本标识时拒绝覆盖，旧 checkout 不能删除较新历史', async () => {
		const remote = changelog([{ version: '0.1.4' }, { version: '0.1.3' }])
		const staleLocal = changelog([{ version: '0.1.5' }, { version: '0.1.3' }])
		const s3 = new MemoryS3()
		s3.seed(remote)

		await expect(publish({ s3, source: staleLocal, targetVersion: '0.1.5' })).rejects.toThrow()
		expect(s3.putCommands).toHaveLength(0)
		expect(s3.objects.get(CHANGELOG_KEY)!.bytes).toEqual(Buffer.from(remote))
	})

	test.each([
		['非 YANKED 改成 YANKED', false, true],
		['YANKED 改回非 YANKED', true, false],
	] as const)('拒绝把远端既有版本%s', async (_name, remoteYanked, localYanked) => {
		const remote = changelog([{ version: '0.1.4' }, { version: '0.1.3', yanked: remoteYanked }])
		const source = changelog([
			{ version: '0.1.5' },
			{ version: '0.1.4' },
			{ version: '0.1.3', yanked: localYanked },
		])
		const s3 = new MemoryS3()
		s3.seed(remote)

		await expect(publish({ s3, source, targetVersion: '0.1.5' })).rejects.toThrow()
		expect(s3.putCommands).toHaveLength(0)
	})

	test.each([409, 412])('CAS %d 后只在远端最终 bytes 完全相同时幂等成功', async (status) => {
		const remote = changelog([{ version: '0.1.3' }])
		const source = changelog([{ version: '0.1.4' }, { version: '0.1.3' }])
		const s3 = new MemoryS3()
		s3.seed(remote, 'opaque-before-race')
		s3.queuePutFailure({ status, mutate: () => s3.seed(source, 'opaque-winner') })

		await publish({ s3, source, targetVersion: '0.1.4' })

		expect(s3.putCommands).toHaveLength(1)
		expect(s3.objects.get(CHANGELOG_KEY)!.bytes).toEqual(Buffer.from(source))
	})

	test.each([409, 412])('CAS %d 后远端即使包含目标版本，只要 bytes 不同也拒绝', async (status) => {
		const remote = changelog([{ version: '0.1.3' }])
		const source = changelog([{ version: '0.1.4' }, { version: '0.1.3' }])
		const winner = changelog([{ version: '0.1.5' }, { version: '0.1.4' }, { version: '0.1.3' }])
		const s3 = new MemoryS3()
		s3.seed(remote, 'opaque-before-race')
		s3.queuePutFailure({ status, mutate: () => s3.seed(winner, 'opaque-winner') })

		await expect(publish({ s3, source, targetVersion: '0.1.4' })).rejects.toThrow()
		expect(s3.putCommands).toHaveLength(1)
		expect(s3.objects.get(CHANGELOG_KEY)!.bytes).toEqual(Buffer.from(winner))
	})

	test('写成功后 S3 bytes 不一致时停止', async () => {
		const source = changelog([{ version: '0.1.4' }])
		const changed = changelog([{ version: '0.1.4', body: '并发修改' }])
		const s3 = new MemoryS3()
		s3.mutateAfterPut(() => s3.seed(changed, 'opaque-after-write'))

		await expect(publish({ s3, source, targetVersion: '0.1.4' })).rejects.toThrow()
		expect(s3.objects.get(CHANGELOG_KEY)!.bytes).toEqual(Buffer.from(changed))
	})

	test('写成功后公开 bytes 不一致时报告失败且不回滚 S3 对象', async () => {
		const source = changelog([{ version: '0.1.4' }])
		const stalePublic = changelog([{ version: '0.1.3' }])
		const s3 = new MemoryS3()

		await expect(
			publish({
				s3,
				source,
				targetVersion: '0.1.4',
				publicBytes: Buffer.from(stalePublic),
			}),
		).rejects.toThrow()
		expect(s3.objects.get(CHANGELOG_KEY)!.bytes).toEqual(Buffer.from(source))
	})

	test('reuse 且远端已有目标版本时严格只读，以远端 bytes 为准', async () => {
		const remote = changelog([
			{ version: '0.1.4-beta.4', body: '远端已发布正文' },
			{ version: '0.1.3' },
		])
		const staleLocal = changelog([
			{ version: '0.1.4-beta.4', body: '旧 checkout 正文' },
			{ version: '0.1.3' },
		])
		const s3 = new MemoryS3()
		const publicReads: string[] = []
		s3.seed(remote)

		await publish({
			s3,
			source: staleLocal,
			targetVersion: '0.1.4-beta.4',
			releaseKind: 'reuse',
			publicBytes: Buffer.from(remote),
			publicReads,
		})

		expect(s3.putCommands).toHaveLength(0)
		expect(s3.objects.get(CHANGELOG_KEY)!.bytes).toEqual(Buffer.from(remote))
		expect(publicReads).toEqual([changelogUrl])
	})

	test.each(['missing-object', 'missing-target'] as const)(
		'reuse 在 %s 的 tag 后崩溃恢复场景可 CAS 补齐完整本地原文',
		async (state) => {
			const remote = changelog([{ version: '0.1.3' }])
			const source = changelog([{ version: '0.1.4-beta.4' }, { version: '0.1.3' }])
			const s3 = new MemoryS3()
			if (state === 'missing-target') s3.seed(remote, 'opaque-before-recovery')

			await publish({
				s3,
				source,
				targetVersion: '0.1.4-beta.4',
				releaseKind: 'reuse',
			})

			expect(s3.putCommands).toHaveLength(1)
			expect(s3.putCommands[0]!.input).toMatchObject(
				state === 'missing-object' ? { IfNoneMatch: '*' } : { IfMatch: 'opaque-before-recovery' },
			)
			expect(s3.objects.get(CHANGELOG_KEY)!.bytes).toEqual(Buffer.from(source))
		},
	)

	test('reuse 恢复仍拒绝用缺少远端版本标识的旧 checkout 覆盖', async () => {
		const remote = changelog([{ version: '0.1.4' }, { version: '0.1.3' }])
		const staleLocal = changelog([{ version: '0.1.5-beta.1' }, { version: '0.1.3' }])
		const s3 = new MemoryS3()
		s3.seed(remote)

		await expect(
			publish({
				s3,
				source: staleLocal,
				targetVersion: '0.1.5-beta.1',
				releaseKind: 'reuse',
			}),
		).rejects.toThrow()
		expect(s3.putCommands).toHaveLength(0)
		expect(s3.objects.get(CHANGELOG_KEY)!.bytes).toEqual(Buffer.from(remote))
	})
})

describe('validatePublishedChangelog', () => {
	test('既有 Tag 补平台只读校验 S3 与公开面，不写 changelog', async () => {
		const source = changelog([{ version: '0.1.4-beta.4' }, { version: '0.1.3' }])
		const s3 = new MemoryS3()
		const publicReads: string[] = []
		s3.seed(source)

		await validatePublishedChangelog({
			client: s3.client(),
			config,
			targetVersion: '0.1.4-beta.4',
			fetchBytes: publicReader(Buffer.from(source), publicReads),
		})

		expect(s3.putCommands).toHaveLength(0)
		expect(s3.getCommands).toHaveLength(1)
		expect(publicReads).toEqual([changelogUrl])
	})

	test('Pointer 推进前要求公开 changelog 与 S3 完全相同', async () => {
		const source = changelog([{ version: '0.1.4-beta.4' }, { version: '0.1.3' }])
		const stalePublic = changelog([{ version: '0.1.3' }])
		const s3 = new MemoryS3()
		s3.seed(source)

		await expect(
			validatePublishedChangelog({
				client: s3.client(),
				config,
				targetVersion: '0.1.4-beta.4',
				fetchBytes: publicReader(Buffer.from(stalePublic)),
			}),
		).rejects.toThrow()
		expect(s3.putCommands).toHaveLength(0)
	})

	test('Pointer 推进前要求 S3 目标版本非 YANKED', async () => {
		const source = changelog([{ version: '0.1.4-beta.4', yanked: true }])
		const s3 = new MemoryS3()
		s3.seed(source)

		await expect(
			validatePublishedChangelog({
				client: s3.client(),
				config,
				targetVersion: '0.1.4-beta.4',
				fetchBytes: publicReader(Buffer.from(source)),
			}),
		).rejects.toThrow()
		expect(s3.putCommands).toHaveLength(0)
	})
})
