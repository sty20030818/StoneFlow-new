import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import path from 'node:path'

import type { ReleaseChannel } from './types'

export function expandHomePath(filePath: string | undefined) {
	if (!filePath) return undefined
	if (filePath === '~') return homedir()
	if (filePath.startsWith('~/')) return path.join(homedir(), filePath.slice(2))
	return filePath
}

export function resolvePlatformKey() {
	const os = process.platform === 'darwin' ? 'darwin' : process.platform
	const arch =
		process.arch === 'arm64' ? 'aarch64' : process.arch === 'x64' ? 'x86_64' : process.arch
	if (os === 'win32') return `windows-${arch}`
	if (os === 'darwin') return `darwin-${arch}`
	if (os === 'linux') return `linux-${arch}`
	throw new Error(`不支持当前发布平台: ${process.platform}-${process.arch}`)
}

/** 各平台独立的 updater 指针 key（R2 object key，含 stoneflow 前缀）。 */
export function platformLatestJsonKey(channel: ReleaseChannel, platformKey: string) {
	return `stoneflow/updates/${channel}/platforms/${platformKey}/latest.json`
}

export function platformReleaseJsonKey(
	channel: ReleaseChannel,
	version: string,
	platformKey: string,
) {
	return `stoneflow/updates/${channel}/releases/${version}/platforms/${platformKey}/release.json`
}

export function platformReleaseArtifactKey(
	channel: ReleaseChannel,
	version: string,
	platformKey: string,
	sha256: string,
	fileName: string,
) {
	return `stoneflow/updates/${channel}/releases/${version}/platforms/${platformKey}/artifacts/${sha256}/${fileName}`
}

export function platformDownloadArtifactKey(
	channel: ReleaseChannel,
	platformKey: string,
	version: string,
	sha256: string,
	fileName: string,
) {
	return `stoneflow/downloads/${channel}/${platformKey}/${version}/${sha256}/${fileName}`
}

/** 各平台独立的 updater 指针公开 URL。 */
export function platformLatestJsonUrl(
	publicUrl: string,
	channel: ReleaseChannel,
	platformKey: string,
) {
	const base = publicUrl.replace(/\/$/, '')
	return `${base}/updates/${channel}/platforms/${platformKey}/latest.json`
}

export function createReleasePaths(input: {
	channel: ReleaseChannel
	platformKey: string
	scriptDir: string
	runId?: string
}) {
	const repoRoot = path.resolve(input.scriptDir, '../..')
	const workDir = path.join(repoRoot, '.release-tmp', input.runId ?? randomUUID())
	const sourceRoot = path.join(workDir, 'source')
	const targetDir = path.join(workDir, 'target')
	const stagingDir = path.join(workDir, 'staged')
	const releaseRoot = path.join(stagingDir, 'updates', input.channel, 'releases')
	const downloadsRoot = path.join(stagingDir, 'downloads', input.channel, input.platformKey)

	return {
		repoRoot,
		workDir,
		sourceRoot,
		targetDir,
		tauriDist: path.join(targetDir, 'release', 'bundle'),
		stagingDir,
		releaseRoot,
		downloadsRoot,
	}
}
