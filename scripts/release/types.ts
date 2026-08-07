export type ReleaseChannel = 'stable' | 'beta'

export const RELEASE_TAG_SCHEMA = '1'
export const LEGACY_RELEASE_TAG_SCHEMA = 'legacy-seed'

export interface ReleaseTagSnapshot {
	readonly name: string
	readonly commit: string
	readonly schema: string | null
}

export interface ReleaseLedgerSnapshot {
	readonly channel: ReleaseChannel
	readonly commit: string | null
}

export interface ReleasePlanInput {
	readonly channel: ReleaseChannel
	readonly sourceVersion: string
	readonly commit: string
	readonly tags: readonly ReleaseTagSnapshot[]
	readonly ledger: ReleaseLedgerSnapshot
}

export interface ReleasePlan {
	readonly kind: 'claim' | 'reuse'
	readonly version: string
	readonly tagName: string
	readonly commit: string
	readonly expectedLedgerCommit: string | null
}

export interface PlatformMeta {
	readonly url: string
	readonly signature: string
}

export interface LatestJson {
	readonly version: string
	readonly platforms: Readonly<Record<string, PlatformMeta>>
}

export interface PlatformUpdater extends PlatformMeta {
	readonly sha256: string
}

export type PlatformDownloadKind = 'dmg' | 'nsis' | 'msi' | 'appimage'

export interface PlatformDownload {
	readonly kind: PlatformDownloadKind
	readonly url: string
	readonly sha256: string
}

export interface PlatformReleaseRecord {
	readonly schemaVersion: 1
	readonly channel: ReleaseChannel
	readonly version: string
	readonly commit: string
	readonly sourceVersion: string
	readonly platform: string
	readonly updater: PlatformUpdater
	readonly downloads: readonly PlatformDownload[]
}

export interface ImmutableArtifactUpload {
	readonly filePath: string
	readonly key: string
	readonly url: string
	readonly sha256: string
}
