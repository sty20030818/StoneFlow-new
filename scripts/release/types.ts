export type ReleaseChannel = 'stable' | 'beta'

export interface PlatformMeta {
	url: string
	signature: string
}

export interface LatestJson {
	version: string
	pub_date: string
	platforms: Record<string, PlatformMeta>
}

export interface ReleasePlatformState {
	status: 'published'
	updatedAt: string
}

export interface ReleaseManifest {
	version: string
	channel: ReleaseChannel
	commit: string
	sourceVersion: string
	createdAt: string
	platforms: Record<string, ReleasePlatformState>
}

export interface UploadItem {
	filePath: string
	key: string
}
