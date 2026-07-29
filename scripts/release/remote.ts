import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { chalk } from './io'
import type { ReleaseChannel, ReleaseManifest, UploadItem } from './types'

export interface ReleaseRemoteConfig {
	publicUrl: string
	bucket: string
	endpoint: string
}

export async function fetchJson<T>(url: string) {
	const response = await fetch(url, {
		signal: AbortSignal.timeout(5000),
	})
	if (response.status === 404) return null
	if (!response.ok) {
		throw new Error(`读取远端 JSON 失败: ${url} HTTP ${response.status}`)
	}
	return (await response.json()) as T
}

export async function readRemoteLatestRelease(
	config: ReleaseRemoteConfig,
	channel: ReleaseChannel,
	allowMissingOnNoUpload: boolean,
) {
	const url = `${config.publicUrl}/updates/${channel}/latest.release.json`
	try {
		return await fetchJson<ReleaseManifest>(url)
	} catch (error) {
		if (!allowMissingOnNoUpload) throw error
		console.log(chalk.yellow('   无法读取全局 release manifest，--no-upload 将按空远端处理'))
		return null
	}
}

export function assertR2Config(config: ReleaseRemoteConfig) {
	if (
		config.bucket &&
		process.env.R2_ACCESS_KEY_ID &&
		process.env.R2_SECRET_ACCESS_KEY &&
		process.env.R2_ACCOUNT_ID
	) {
		return
	}
	throw new Error(
		'缺少 R2 配置环境变量: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME',
	)
}

export function createS3Client(config: ReleaseRemoteConfig) {
	return new S3Client({
		region: 'auto',
		endpoint: config.endpoint,
		credentials: {
			accessKeyId: process.env.R2_ACCESS_KEY_ID!,
			secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
		},
	})
}

function isMutableReleasePointer(fileName: string) {
	return (
		fileName === 'CHANGELOG.md' ||
		fileName === 'latest.json' ||
		fileName === 'latest.release.json' ||
		fileName.startsWith('latest.') ||
		fileName.startsWith('latest-')
	)
}

export async function uploadItems(config: ReleaseRemoteConfig, items: UploadItem[]) {
	const s3Client = createS3Client(config)

	for (const item of items) {
		const fileName = path.basename(item.filePath)
		const body = await readFile(item.filePath)
		const isMutableFile = isMutableReleasePointer(fileName)

		console.log(chalk.gray(`   上传 ${item.key}...`))
		await s3Client.send(
			new PutObjectCommand({
				Bucket: config.bucket,
				Key: item.key,
				Body: body,
				ContentType: fileName.endsWith('.json')
					? 'application/json'
					: fileName === 'CHANGELOG.md'
						? 'text/markdown; charset=utf-8'
						: 'application/octet-stream',
				CacheControl: isMutableFile ? 'no-cache' : 'public, max-age=31536000, immutable',
			}),
		)
		console.log(chalk.green(`   ✓ ${fileName}`))
	}
}
