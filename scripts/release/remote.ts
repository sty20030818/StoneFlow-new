import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

export interface ReleaseRemoteConfig {
	readonly publicUrl: string
	readonly bucket: string
	readonly endpoint: string
}

interface RemoteGetOutput {
	readonly Body?: { transformToByteArray(): Promise<Uint8Array> }
	readonly ETag?: string
}

export interface S3ObjectClient {
	send(command: GetObjectCommand): Promise<RemoteGetOutput>
	send(command: PutObjectCommand): Promise<unknown>
}

export interface RemoteObject {
	readonly bytes: Uint8Array
	readonly etag: string
}

type PutRemoteObjectInput = {
	readonly bucket: string
	readonly key: string
	readonly body: Uint8Array
	readonly contentType: string
	readonly cacheControl: string
} & (
	| { readonly ifNoneMatch: '*'; readonly ifMatch?: never }
	| { readonly ifMatch: string; readonly ifNoneMatch?: never }
)

function httpStatus(error: unknown) {
	if (!error || typeof error !== 'object') return undefined
	return (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
}

export async function getRemoteObject(
	client: S3ObjectClient,
	bucket: string,
	key: string,
): Promise<RemoteObject | null> {
	let output: RemoteGetOutput
	try {
		output = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
	} catch (error) {
		if (httpStatus(error) === 404) return null
		throw error
	}
	if (!output.Body) throw new Error(`S3 GetObject ${key} 响应缺少 Body`)
	if (!output.ETag) throw new Error(`S3 GetObject ${key} 响应缺少 ETag`)
	return { bytes: await output.Body.transformToByteArray(), etag: output.ETag }
}

export async function putRemoteObject(
	client: S3ObjectClient,
	input: PutRemoteObjectInput,
): Promise<'written' | 'conflict'> {
	try {
		await client.send(
			new PutObjectCommand({
				Bucket: input.bucket,
				Key: input.key,
				Body: input.body,
				ContentType: input.contentType,
				CacheControl: input.cacheControl,
				IfNoneMatch: input.ifNoneMatch,
				IfMatch: input.ifMatch,
			}),
		)
		return 'written'
	} catch (error) {
		const status = httpStatus(error)
		if (status === 409 || status === 412) return 'conflict'
		throw error
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

export function createS3Client(config: ReleaseRemoteConfig): S3ObjectClient {
	return new S3Client({
		region: 'auto',
		endpoint: config.endpoint,
		credentials: {
			accessKeyId: process.env.R2_ACCESS_KEY_ID!,
			secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
		},
	})
}
