import { describe, expect, test } from 'bun:test'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

import { getRemoteObject, putRemoteObject, type S3ObjectClient } from './remote'

function httpError(status: number) {
	return Object.assign(new Error(`HTTP ${status}`), {
		$metadata: { httpStatusCode: status },
	})
}

describe('S3 条件对象读写', () => {
	test('GetObject 返回原始 bytes，并把 ETag 当作不透明 CAS token', async () => {
		const etag = 'W/"opaque,multipart-7-3"'
		const bytes = Buffer.from('remote bytes')
		const commands: unknown[] = []
		const client = {
			async send(command: unknown) {
				commands.push(command)
				return {
					Body: { transformToByteArray: async () => bytes },
					ETag: etag,
				}
			},
		} as S3ObjectClient

		await expect(getRemoteObject(client, 'release-bucket', 'stoneflow/object')).resolves.toEqual({
			bytes,
			etag,
		})
		expect(commands).toHaveLength(1)
		expect(commands[0]).toBeInstanceOf(GetObjectCommand)
		expect((commands[0] as GetObjectCommand).input).toEqual({
			Bucket: 'release-bucket',
			Key: 'stoneflow/object',
		})
	})

	test('GetObject 只把 404 当作不存在，其他错误与缺失响应字段均拒绝', async () => {
		const missingClient = {
			send: async () => {
				throw httpError(404)
			},
		} as S3ObjectClient
		await expect(getRemoteObject(missingClient, 'bucket', 'missing')).resolves.toBeNull()

		const failedClient = {
			send: async () => {
				throw httpError(500)
			},
		} as S3ObjectClient
		await expect(getRemoteObject(failedClient, 'bucket', 'failed')).rejects.toThrow('HTTP 500')

		const malformedClient = {
			send: async () => ({ ETag: 'opaque-without-body' }),
		} as S3ObjectClient
		await expect(getRemoteObject(malformedClient, 'bucket', 'malformed')).rejects.toThrow()

		const missingEtagClient = {
			send: async () => ({
				Body: { transformToByteArray: async () => Buffer.from('body') },
			}),
		} as S3ObjectClient
		await expect(getRemoteObject(missingEtagClient, 'bucket', 'missing-etag')).rejects.toThrow()
	})

	test('PutObject 分别映射 If-None-Match 与原样 If-Match', async () => {
		const commands: PutObjectCommand[] = []
		const client = {
			async send(command: unknown) {
				commands.push(command as PutObjectCommand)
				return {}
			},
		} as S3ObjectClient
		const opaqueEtag = 'W/"opaque,multipart-8-4"'

		await expect(
			putRemoteObject(client, {
				bucket: 'release-bucket',
				key: 'immutable',
				body: Buffer.from('artifact'),
				contentType: 'application/octet-stream',
				cacheControl: 'public, max-age=31536000, immutable',
				ifNoneMatch: '*',
			}),
		).resolves.toBe('written')
		await expect(
			putRemoteObject(client, {
				bucket: 'release-bucket',
				key: 'pointer',
				body: Buffer.from('{}'),
				contentType: 'application/json',
				cacheControl: 'no-cache',
				ifMatch: opaqueEtag,
			}),
		).resolves.toBe('written')

		expect(commands.every((command) => command instanceof PutObjectCommand)).toBeTrue()
		expect(commands[0]!.input).toMatchObject({
			Bucket: 'release-bucket',
			Key: 'immutable',
			IfNoneMatch: '*',
			ContentType: 'application/octet-stream',
			CacheControl: 'public, max-age=31536000, immutable',
		})
		expect(commands[0]!.input.IfMatch).toBeUndefined()
		expect(commands[1]!.input).toMatchObject({
			Bucket: 'release-bucket',
			Key: 'pointer',
			IfMatch: opaqueEtag,
			ContentType: 'application/json',
			CacheControl: 'no-cache',
		})
		expect(commands[1]!.input.IfNoneMatch).toBeUndefined()
	})

	test('PutObject 只把 409/412 归类为条件冲突', async () => {
		for (const status of [409, 412]) {
			const client = {
				send: async () => {
					throw httpError(status)
				},
			} as S3ObjectClient
			await expect(
				putRemoteObject(client, {
					bucket: 'bucket',
					key: 'key',
					body: Buffer.from('body'),
					contentType: 'application/octet-stream',
					cacheControl: 'no-cache',
					ifNoneMatch: '*',
				}),
			).resolves.toBe('conflict')
		}

		const client = {
			send: async () => {
				throw httpError(500)
			},
		} as S3ObjectClient
		await expect(
			putRemoteObject(client, {
				bucket: 'bucket',
				key: 'key',
				body: Buffer.from('body'),
				contentType: 'application/octet-stream',
				cacheControl: 'no-cache',
				ifNoneMatch: '*',
			}),
		).rejects.toThrow('HTTP 500')
	})
})
