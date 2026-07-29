import path from 'node:path'

import type { LatestJson, ReleaseManifest, ReleasePlatformState, UploadItem } from './types'

const GLOBAL_CHANGELOG_KEY = 'stoneflow/CHANGELOG.md'

export function createLatestJson(input: {
	version: string
	pubDate: string
	platforms: LatestJson['platforms']
	previousLatest: LatestJson | null
}) {
	return {
		version: input.version,
		pub_date: input.pubDate,
		platforms:
			input.previousLatest?.version === input.version
				? { ...input.previousLatest.platforms, ...input.platforms }
				: input.platforms,
	}
}

export function createReleaseManifest(input: {
	version: string
	channel: ReleaseManifest['channel']
	commit: string
	sourceVersion: string
	pubDate: string
	platformKey: string
	latestRelease: ReleaseManifest | null
}) {
	const existingPlatforms =
		input.latestRelease?.version === input.version ? input.latestRelease.platforms : {}
	const platformState: ReleasePlatformState = {
		status: 'published',
		updatedAt: input.pubDate,
	}

	return {
		version: input.version,
		channel: input.channel,
		commit: input.commit,
		sourceVersion: input.sourceVersion,
		createdAt:
			input.latestRelease?.version === input.version
				? input.latestRelease.createdAt
				: input.pubDate,
		platforms: {
			...existingPlatforms,
			[input.platformKey]: platformState,
		},
	}
}

function isMutableReleasePointer(fileName: string) {
	return (
		fileName === 'latest.json' ||
		fileName === 'latest.release.json' ||
		fileName.startsWith('latest.') ||
		fileName.startsWith('latest-')
	)
}

function isGlobalChangelogUpload(item: UploadItem) {
	return item.key === GLOBAL_CHANGELOG_KEY && path.basename(item.filePath) === 'CHANGELOG.md'
}

export function assertLatestJsonConsistency(
	latest: LatestJson,
	version: string,
	uploadItems: UploadItem[],
) {
	const errors: string[] = []
	const uploadByBaseName = new Map(uploadItems.map((item) => [path.basename(item.filePath), item]))

	if (latest.version !== version) {
		errors.push(`latest.json.version=${latest.version} 与发布版本 ${version} 不一致`)
	}

	if (Object.keys(latest.platforms).length === 0) {
		errors.push('latest.json.platforms 为空')
	}

	for (const [platformKey, meta] of Object.entries(latest.platforms)) {
		if (!meta.url?.trim()) {
			errors.push(`platform ${platformKey}: url 为空`)
			continue
		}
		if (!meta.signature?.trim()) {
			errors.push(`platform ${platformKey}: signature 为空`)
		}

		let parsedUrl: URL
		try {
			parsedUrl = new URL(meta.url)
		} catch {
			errors.push(`platform ${platformKey}: url 非法 ${meta.url}`)
			continue
		}

		const urlFileName = path.posix.basename(parsedUrl.pathname)
		const pathSegments = parsedUrl.pathname.split('/').filter(Boolean)

		if (!pathSegments.includes(version)) {
			errors.push(`platform ${platformKey}: url 路径未包含版本目录 ${version}: ${meta.url}`)
		}

		if (urlFileName.startsWith('StoneFlow') && !urlFileName.includes(version)) {
			errors.push(`platform ${platformKey}: 产物文件名未包含版本 ${version}: ${urlFileName}`)
		}

		const uploadedThisRun = uploadItems.some((item) =>
			item.key.includes(`/platforms/${platformKey}/`),
		)
		if (!uploadedThisRun) continue

		const artifactUpload = uploadByBaseName.get(urlFileName)
		if (!artifactUpload || !artifactUpload.key.includes(`/${version}/`)) {
			errors.push(`platform ${platformKey}: 上传列表中找不到版本目录下的 ${urlFileName}`)
		}

		const sigUpload = uploadByBaseName.get(`${urlFileName}.sig`)
		if (!sigUpload || !sigUpload.key.includes(`/${version}/`)) {
			errors.push(`platform ${platformKey}: 上传列表中找不到版本目录下的 ${urlFileName}.sig`)
		}
	}

	for (const item of uploadItems) {
		const base = path.basename(item.filePath)
		if (isGlobalChangelogUpload(item)) continue
		if (isMutableReleasePointer(base) || base.endsWith('.json')) continue

		const artifactName = base.endsWith('.sig') ? base.slice(0, -'.sig'.length) : base
		if (artifactName.startsWith('StoneFlow') && !artifactName.includes(version)) {
			errors.push(`待上传产物/签名文件名未含版本: ${base} (key=${item.key})`)
		}

		if (!isMutableReleasePointer(base) && !item.key.includes(`/${version}/`)) {
			errors.push(`上传 key 未落在版本目录 ${version}: ${item.key}`)
		}
	}

	if (errors.length > 0) {
		throw new Error(
			`发布一致性校验失败（已阻止上传）:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
		)
	}
}
