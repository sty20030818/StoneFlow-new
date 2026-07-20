import { homedir } from 'node:os'
import path from 'node:path'

import type { ReleaseChannel } from './types'

export const BUNDLE_OUTPUT_DIRS = ['nsis', 'msi', 'dmg', 'macos', 'appimage'] as const

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

export function createReleasePaths(input: {
	channel: ReleaseChannel
	platformKey: string
	scriptDir: string
}) {
	const repoRoot = path.resolve(input.scriptDir, '../..')
	const workDir = path.join(repoRoot, '.release-tmp')
	const releaseRoot = path.join(workDir, 'updates', input.channel, 'releases')
	const downloadsRoot = path.join(workDir, 'downloads', input.channel, input.platformKey)

	return {
		repoRoot,
		tauriConfPath: path.join(repoRoot, 'src-tauri/tauri.conf.json'),
		tauriDist: path.join(repoRoot, 'src-tauri/target/release/bundle'),
		notesPath: path.join(repoRoot, 'RELEASE_NOTES.md'),
		workDir,
		releaseRoot,
		downloadsRoot,
	}
}
