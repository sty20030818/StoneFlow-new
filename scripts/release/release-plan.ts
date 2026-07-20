import type { ReleaseChannel, ReleaseManifest } from './types'

export interface ReleasePlanInput {
	channel: ReleaseChannel
	sourceVersion: string
	commit: string
	latestRelease: ReleaseManifest | null
	specifiedVersion?: string
}

export interface ReleasePlan {
	version: string
	isExistingCommitRelease: boolean
}

export function parseStableVersion(version: string) {
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
	if (!match) return null
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
	}
}

export function nextPatchVersion(version: string) {
	const parsed = parseStableVersion(version)
	if (!parsed) {
		throw new Error(`stable 版本必须是 x.y.z，当前是 ${version}`)
	}
	return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`
}

function parseBetaVersion(version: string, betaBaseVersion: string) {
	const match = new RegExp(`^${betaBaseVersion.replaceAll('.', '\\.')}-beta\\.(\\d+)$`).exec(
		version,
	)
	return match ? Number(match[1]) : null
}

export function resolveReleasePlan(input: ReleasePlanInput): ReleasePlan {
	if (!parseStableVersion(input.sourceVersion)) {
		throw new Error(`配置版本必须是 x.y.z，当前是 ${input.sourceVersion}`)
	}

	const assertVersionCommitBinding = (version: string) => {
		if (input.latestRelease?.version === version && input.latestRelease.commit !== input.commit) {
			throw new Error(
				`版本 ${version} 已绑定到 commit ${input.latestRelease.commit}，当前 commit 是 ${input.commit}`,
			)
		}
	}

	if (input.specifiedVersion) {
		assertVersionCommitBinding(input.specifiedVersion)
		return {
			version: input.specifiedVersion,
			isExistingCommitRelease: input.latestRelease?.commit === input.commit,
		}
	}

	if (input.channel === 'stable') {
		assertVersionCommitBinding(input.sourceVersion)
		return {
			version: input.sourceVersion,
			isExistingCommitRelease: input.latestRelease?.commit === input.commit,
		}
	}

	const betaBaseVersion = nextPatchVersion(input.sourceVersion)
	if (input.latestRelease?.commit === input.commit && input.latestRelease.version) {
		return {
			version: input.latestRelease.version,
			isExistingCommitRelease: true,
		}
	}

	const latestBetaNumber = input.latestRelease
		? parseBetaVersion(input.latestRelease.version, betaBaseVersion)
		: null

	return {
		version: `${betaBaseVersion}-beta.${latestBetaNumber ? latestBetaNumber + 1 : 1}`,
		isExistingCommitRelease: false,
	}
}
