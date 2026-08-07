import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { listDirFiles, logArtifact } from './io'
import { platformDownloadArtifactKey, platformReleaseArtifactKey } from './paths'
import { verifyUpdaterSignature } from './signature'
import type {
	PlatformDownload,
	PlatformDownloadKind,
	PlatformUpdater,
	ReleaseChannel,
	ImmutableArtifactUpload,
} from './types'

function versionNameToken(version: string) {
	return `_${version}_`
}

function fileNameContainsVersion(filePath: string, version: string) {
	return path.basename(filePath).includes(versionNameToken(version))
}

function resolveUniqueArtifact(
	candidates: string[],
	version: string,
	label: string,
	requireVersionInName: boolean,
) {
	if (candidates.length === 0) return null

	const versionMatched = candidates.filter((file) => fileNameContainsVersion(file, version))
	const names = (files: string[]) => files.map((file) => path.basename(file)).join(', ')

	if (requireVersionInName) {
		if (versionMatched.length === 1) return versionMatched[0]!
		if (versionMatched.length === 0) {
			throw new Error(
				`${label}: 未找到包含 ${versionNameToken(version)} 的产物。候选: ${names(candidates) || '(无)'}`,
			)
		}
		throw new Error(
			`${label}: 找到多个匹配版本 ${version} 的产物，拒绝猜测: ${names(versionMatched)}`,
		)
	}

	if (versionMatched.length === 1) return versionMatched[0]!
	if (versionMatched.length > 1) {
		throw new Error(
			`${label}: 找到多个匹配版本 ${version} 的产物，拒绝猜测: ${names(versionMatched)}`,
		)
	}
	if (candidates.length === 1) return candidates[0]!
	throw new Error(`${label}: 无法唯一确定产物（目录应在构建前清空）。候选: ${names(candidates)}`)
}

function requireSignaturePair(artifactPath: string) {
	const signaturePath = `${artifactPath}.sig`
	if (!existsSync(signaturePath)) {
		throw new Error(`缺少签名文件: ${signaturePath}（对应产物 ${path.basename(artifactPath)}）`)
	}
	return signaturePath
}

async function readValidatedSignature(signaturePath: string, artifactFileName: string) {
	const raw = (await readFile(signaturePath, 'utf8')).trim()
	if (!raw) throw new Error(`签名文件为空: ${path.basename(signaturePath)}`)

	let decoded = raw
	try {
		const asUtf8 = Buffer.from(raw, 'base64').toString('utf8')
		if (asUtf8.includes('file:') || asUtf8.includes('untrusted comment')) decoded = asUtf8
	} catch {
		// 非 base64 签名按原文验证。
	}
	if (!decoded.includes(`file:${artifactFileName}`) && !decoded.includes(artifactFileName)) {
		throw new Error(
			`签名文件与产物不匹配: ${path.basename(signaturePath)} 未声明 file:${artifactFileName}` +
				'（已尝试 base64 解码检查）',
		)
	}
	return raw
}

function digest(bytes: Uint8Array) {
	return createHash('sha256').update(bytes).digest('hex')
}

function publicObjectUrl(publicUrl: string, key: string) {
	const relativeKey = key.startsWith('stoneflow/') ? key.slice('stoneflow/'.length) : key
	return `${publicUrl.replace(/\/$/, '')}/${relativeKey}`
}

async function stageArtifact(input: {
	sourcePath: string
	targetRoot: string
	targetFileName: string
	key: (sha256: string) => string
	publicUrl: string
}) {
	const bytes = await readFile(input.sourcePath)
	const sha256 = digest(bytes)
	const key = input.key(sha256)
	const targetPath = path.join(input.targetRoot, sha256, input.targetFileName)
	await mkdir(path.dirname(targetPath), { recursive: true })
	await writeFile(targetPath, bytes)
	return {
		sha256,
		url: publicObjectUrl(input.publicUrl, key),
		uploadItem: {
			filePath: targetPath,
			key,
			url: publicObjectUrl(input.publicUrl, key),
			sha256,
		} satisfies ImmutableArtifactUpload,
	}
}

export interface CollectedArtifacts {
	readonly updater: PlatformUpdater
	readonly downloads: readonly PlatformDownload[]
	readonly uploadItems: readonly ImmutableArtifactUpload[]
}

export async function collectReleaseArtifacts(input: {
	channel: ReleaseChannel
	platformKey: string
	version: string
	tauriDist: string
	releaseVersionDir: string
	downloadsVersionDir: string
	publicUrl: string
	updaterPublicKey: string
	repoRoot: string
}): Promise<CollectedArtifacts> {
	let updater: PlatformUpdater | undefined
	let updaterSourcePath: string | undefined
	const downloads: PlatformDownload[] = []
	const uploadItems: ImmutableArtifactUpload[] = []

	async function addUpdaterArtifact(
		filePath: string,
		signaturePath: string,
		targetFileName = path.basename(filePath),
	) {
		if (updater) throw new Error('找到多个 updater 产物，拒绝猜测当前平台目标')
		if (targetFileName.startsWith('StoneFlow') && !targetFileName.includes(input.version)) {
			throw new Error(
				`updater 目标文件名未包含版本 ${input.version}: ${targetFileName}（源 ${path.basename(filePath)}）`,
			)
		}

		const signature = await readValidatedSignature(signaturePath, path.basename(filePath))
		const staged = await stageArtifact({
			sourcePath: filePath,
			targetRoot: path.join(input.releaseVersionDir, 'platforms', input.platformKey, 'artifacts'),
			targetFileName,
			key: (sha256) =>
				platformReleaseArtifactKey(
					input.channel,
					input.version,
					input.platformKey,
					sha256,
					targetFileName,
				),
			publicUrl: input.publicUrl,
		})
		await verifyUpdaterSignature({
			repoRoot: input.repoRoot,
			artifactPath: staged.uploadItem.filePath,
			signature,
			publicKey: input.updaterPublicKey,
		})
		updater = { url: staged.url, signature, sha256: staged.sha256 }
		updaterSourcePath = filePath
		uploadItems.push(staged.uploadItem)
		await logArtifact(`${input.platformKey} updater`, staged.uploadItem.filePath)
	}

	async function addDownloadArtifact(filePath: string, kind: PlatformDownloadKind) {
		const fileName = path.basename(filePath)
		if (fileName.startsWith('StoneFlow') && !fileName.includes(input.version)) {
			throw new Error(`下载包文件名未包含版本 ${input.version}: ${fileName}`)
		}

		if (updater && updaterSourcePath === filePath) {
			downloads.push({ kind, url: updater.url, sha256: updater.sha256 })
			return
		}

		const staged = await stageArtifact({
			sourcePath: filePath,
			targetRoot: input.downloadsVersionDir,
			targetFileName: fileName,
			key: (sha256) =>
				platformDownloadArtifactKey(
					input.channel,
					input.platformKey,
					input.version,
					sha256,
					fileName,
				),
			publicUrl: input.publicUrl,
		})
		downloads.push({ kind, url: staged.url, sha256: staged.sha256 })
		uploadItems.push(staged.uploadItem)
		await logArtifact(`下载包 ${kind}`, staged.uploadItem.filePath)
	}

	if (input.platformKey.startsWith('darwin-')) {
		const macUpdaterCandidates = await listDirFiles(
			path.join(input.tauriDist, 'macos'),
			(name) => name.endsWith('.app.tar.gz') && !name.endsWith('.app.tar.gz.sig'),
		)
		const macUpdaterFile = resolveUniqueArtifact(
			macUpdaterCandidates,
			input.version,
			'macOS updater (.app.tar.gz)',
			false,
		)
		if (!macUpdaterFile) throw new Error('未找到当前平台 updater 产物，请检查构建是否成功')
		const arch = input.platformKey.replace('darwin-', '')
		await addUpdaterArtifact(
			macUpdaterFile,
			requireSignaturePair(macUpdaterFile),
			`StoneFlow_${input.version}_${arch}.app.tar.gz`,
		)
		const dmgCandidates = await listDirFiles(path.join(input.tauriDist, 'dmg'), (name) =>
			name.endsWith('.dmg'),
		)
		const dmgFile = resolveUniqueArtifact(dmgCandidates, input.version, 'macOS DMG', true)
		if (dmgFile) await addDownloadArtifact(dmgFile, 'dmg')
	} else if (input.platformKey.startsWith('linux-')) {
		const appImageCandidates = await listDirFiles(
			path.join(input.tauriDist, 'appimage'),
			(name) => name.endsWith('.AppImage.tar.gz') && !name.endsWith('.sig'),
		)
		const appImageFile = resolveUniqueArtifact(
			appImageCandidates,
			input.version,
			'Linux AppImage.tar.gz',
			true,
		)
		if (!appImageFile) throw new Error('未找到当前平台 updater 产物，请检查构建是否成功')
		await addUpdaterArtifact(appImageFile, requireSignaturePair(appImageFile))
		await addDownloadArtifact(appImageFile, 'appimage')
	} else if (input.platformKey.startsWith('windows-')) {
		const nsisCandidates = await listDirFiles(
			path.join(input.tauriDist, 'nsis'),
			(name) => name.endsWith('.exe') && !name.endsWith('.sig'),
		)
		const nsisFile = resolveUniqueArtifact(nsisCandidates, input.version, 'Windows NSIS', true)
		const msiCandidates = await listDirFiles(
			path.join(input.tauriDist, 'msi'),
			(name) => name.endsWith('.msi') && !name.endsWith('.sig'),
		)
		const msiFile = resolveUniqueArtifact(msiCandidates, input.version, 'Windows MSI', true)
		const windowsArtifact = nsisFile ?? msiFile
		if (!windowsArtifact) {
			throw new Error('未找到当前平台 updater 产物，请检查构建是否成功')
		}
		const kind = nsisFile ? 'nsis' : 'msi'
		await addUpdaterArtifact(windowsArtifact, requireSignaturePair(windowsArtifact))
		await addDownloadArtifact(windowsArtifact, kind)
	} else {
		throw new Error(`不支持的发布平台: ${input.platformKey}`)
	}

	if (!updater) throw new Error('当前平台 updater 产物收集失败')
	return { updater, downloads, uploadItems }
}
