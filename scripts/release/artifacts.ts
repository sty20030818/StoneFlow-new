import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { listDirFiles, logArtifact } from './io'
import type { PlatformMeta, ReleaseChannel, UploadItem } from './types'

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
	const names = (files: string[]) => files.map((f) => path.basename(f)).join(', ')

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

async function requireSignaturePair(artifactPath: string): Promise<string> {
	const sigPath = `${artifactPath}.sig`
	if (!existsSync(sigPath)) {
		throw new Error(`缺少签名文件: ${sigPath}（对应产物 ${path.basename(artifactPath)}）`)
	}
	return sigPath
}

async function assertSignatureMentionsFile(sigPath: string, artifactFileName: string) {
	const raw = (await readFile(sigPath, 'utf8')).trim()
	if (!raw) {
		throw new Error(`签名文件为空: ${path.basename(sigPath)}`)
	}

	let decoded = raw
	try {
		const asUtf8 = Buffer.from(raw, 'base64').toString('utf8')
		if (asUtf8.includes('file:') || asUtf8.includes('untrusted comment')) {
			decoded = asUtf8
		}
	} catch {
		// 保持 raw
	}

	if (decoded.includes(`file:${artifactFileName}`)) return
	if (decoded.includes(artifactFileName)) return

	throw new Error(
		`签名文件与产物不匹配: ${path.basename(sigPath)} 未声明 file:${artifactFileName}` +
			`（已尝试 base64 解码检查）`,
	)
}

export interface CollectedArtifacts {
	platforms: Record<string, PlatformMeta>
	uploadItems: UploadItem[]
}

export async function collectReleaseArtifacts(input: {
	channel: ReleaseChannel
	platformKey: string
	version: string
	tauriDist: string
	releaseVersionDir: string
	downloadsVersionDir: string
	publicUrl: string
}): Promise<CollectedArtifacts> {
	const platforms: Record<string, PlatformMeta> = {}
	const uploadItems: UploadItem[] = []

	async function addUpdaterArtifact(
		platformKey: string,
		filePath: string,
		sigPath: string,
		targetFileName = path.basename(filePath),
	) {
		if (targetFileName.startsWith('StoneFlow') && !targetFileName.includes(input.version)) {
			throw new Error(
				`updater 目标文件名未包含版本 ${input.version}: ${targetFileName}（源 ${path.basename(filePath)}）`,
			)
		}

		await assertSignatureMentionsFile(sigPath, path.basename(filePath))

		const signature = await readFile(sigPath, 'utf8')
		await mkdir(input.releaseVersionDir, { recursive: true })
		const targetPath = path.join(input.releaseVersionDir, 'platforms', platformKey, targetFileName)
		const targetSigPath = path.join(
			input.releaseVersionDir,
			'platforms',
			platformKey,
			`${targetFileName}.sig`,
		)
		await mkdir(path.dirname(targetPath), { recursive: true })

		await copyFile(filePath, targetPath)
		await copyFile(sigPath, targetSigPath)
		platforms[platformKey] = {
			url: `${input.publicUrl}/updates/${input.channel}/releases/${input.version}/platforms/${platformKey}/${targetFileName}`,
			signature: signature.trim(),
		}
		uploadItems.push(
			{
				filePath: targetPath,
				key: `stoneflow/updates/${input.channel}/releases/${input.version}/platforms/${platformKey}/${targetFileName}`,
			},
			{
				filePath: targetSigPath,
				key: `stoneflow/updates/${input.channel}/releases/${input.version}/platforms/${platformKey}/${targetFileName}.sig`,
			},
		)
		await logArtifact(`${platformKey} updater`, targetPath)
		await logArtifact(`${platformKey} signature`, targetSigPath)
	}

	async function addDownloadArtifact(filePath: string, latestFileName: string) {
		const fileName = path.basename(filePath)
		if (fileName.startsWith('StoneFlow') && !fileName.includes(input.version)) {
			throw new Error(`下载包文件名未包含版本 ${input.version}: ${fileName}`)
		}

		await mkdir(input.downloadsVersionDir, { recursive: true })
		const targetPath = path.join(input.downloadsVersionDir, fileName)
		const latestPath = path.join(path.dirname(input.downloadsVersionDir), latestFileName)

		await copyFile(filePath, targetPath)
		await copyFile(filePath, latestPath)
		uploadItems.push(
			{
				filePath: targetPath,
				key: `stoneflow/downloads/${input.channel}/${input.platformKey}/${input.version}/${fileName}`,
			},
			{
				filePath: latestPath,
				key: `stoneflow/downloads/${input.channel}/${input.platformKey}/${latestFileName}`,
			},
		)
		await logArtifact(`下载包 ${latestFileName}`, targetPath)
	}

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
	if (macUpdaterFile) {
		const macSig = await requireSignaturePair(macUpdaterFile)
		const arch = input.platformKey.replace('darwin-', '')
		await addUpdaterArtifact(
			input.platformKey,
			macUpdaterFile,
			macSig,
			`StoneFlow_${input.version}_${arch}.app.tar.gz`,
		)
	}

	const dmgCandidates = await listDirFiles(path.join(input.tauriDist, 'dmg'), (name) =>
		name.endsWith('.dmg'),
	)
	const dmgFile = resolveUniqueArtifact(dmgCandidates, input.version, 'macOS DMG', true)
	if (dmgFile) {
		await addDownloadArtifact(dmgFile, 'latest.dmg')
	}

	const appimageCandidates = await listDirFiles(
		path.join(input.tauriDist, 'appimage'),
		(name) => name.endsWith('.AppImage.tar.gz') && !name.endsWith('.sig'),
	)
	const appimageFile = resolveUniqueArtifact(
		appimageCandidates,
		input.version,
		'Linux AppImage.tar.gz',
		true,
	)
	if (appimageFile) {
		const appimageSig = await requireSignaturePair(appimageFile)
		await addUpdaterArtifact(input.platformKey, appimageFile, appimageSig)
		await addDownloadArtifact(appimageFile, 'latest.AppImage.tar.gz')
	}

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

	if (nsisFile) {
		const nsisSig = await requireSignaturePair(nsisFile)
		await addUpdaterArtifact(input.platformKey, nsisFile, nsisSig)
		await addDownloadArtifact(nsisFile, 'latest-setup.exe')
	} else if (msiFile) {
		const msiSig = await requireSignaturePair(msiFile)
		await addUpdaterArtifact(input.platformKey, msiFile, msiSig)
		await addDownloadArtifact(msiFile, 'latest.msi')
	}

	if (Object.keys(platforms).length === 0) {
		throw new Error('未找到任何构建产物，请检查构建是否成功')
	}

	return { platforms, uploadItems }
}
