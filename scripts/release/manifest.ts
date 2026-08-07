import type { LatestJson, PlatformReleaseRecord, PlatformUpdater, ReleaseChannel } from './types'

export function createPlatformReleaseRecord(input: {
	channel: ReleaseChannel
	version: string
	commit: string
	sourceVersion: string
	platform: string
	updater: PlatformUpdater
	downloads: PlatformReleaseRecord['downloads']
}): PlatformReleaseRecord {
	return {
		schemaVersion: 1,
		channel: input.channel,
		version: input.version,
		commit: input.commit,
		sourceVersion: input.sourceVersion,
		platform: input.platform,
		updater: input.updater,
		downloads: input.downloads,
	}
}

/** 生成只包含当前平台的 Tauri updater Pointer。 */
export function createLatestJson(input: {
	version: string
	platformKey: string
	updater: PlatformUpdater
}): LatestJson {
	return {
		version: input.version,
		platforms: {
			[input.platformKey]: {
				url: input.updater.url,
				signature: input.updater.signature,
			},
		},
	}
}
