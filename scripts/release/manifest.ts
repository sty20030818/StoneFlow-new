import path from 'node:path'

import type { LatestJson, ReleaseManifest, ReleasePlatformState, UploadItem } from './types'

const GLOBAL_CHANGELOG_KEY = 'stoneflow/CHANGELOG.md'

/**
 * 生成**单平台** updater 指针。
 *
 * 每个平台各自一份 latest.json，version 只代表该平台当前可升级版本；
 * 不跨平台 merge，避免「全局 beta.5 + 无 darwin」把 Mac 卡死在旧版。
 */
export function createLatestJson(input: {
	version: string
	pubDate: string
	platformKey: string
	platforms: LatestJson['platforms']
}): LatestJson {
	const meta = input.platforms[input.platformKey]
	if (!meta) {
		throw new Error(`createLatestJson: platforms 缺少当前平台 ${input.platformKey}`)
	}
	return {
		version: input.version,
		pub_date: input.pubDate,
		platforms: {
			[input.platformKey]: meta,
		},
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
	platformKey: string,
) {
	const errors: string[] = []
	const uploadByBaseName = new Map(uploadItems.map((item) => [path.basename(item.filePath), item]))
	const platformKeys = Object.keys(latest.platforms)

	if (latest.version !== version) {
		errors.push(`latest.json.version=${latest.version} 与发布版本 ${version} 不一致`)
	}

	if (platformKeys.length !== 1 || platformKeys[0] !== platformKey) {
		errors.push(
			`平台 latest.json 必须仅包含当前平台 ${platformKey}，实际: ${platformKeys.join(', ') || '(空)'}`,
		)
	}

	for (const [entryPlatformKey, meta] of Object.entries(latest.platforms)) {
		if (!meta.url?.trim()) {
			errors.push(`platform ${entryPlatformKey}: url 为空`)
			continue
		}
		if (!meta.signature?.trim()) {
			errors.push(`platform ${entryPlatformKey}: signature 为空`)
		}

		let parsedUrl: URL
		try {
			parsedUrl = new URL(meta.url)
		} catch {
			errors.push(`platform ${entryPlatformKey}: url 非法 ${meta.url}`)
			continue
		}

		const urlFileName = path.posix.basename(parsedUrl.pathname)
		const pathSegments = parsedUrl.pathname.split('/').filter(Boolean)

		if (!pathSegments.includes(version)) {
			errors.push(
				`platform ${entryPlatformKey}: url 路径未包含版本目录 ${version}: ${meta.url}`,
			)
		}

		if (urlFileName.startsWith('StoneFlow') && !urlFileName.includes(version)) {
			errors.push(
				`platform ${entryPlatformKey}: 产物文件名未包含版本 ${version}: ${urlFileName}`,
			)
		}

		// 只认本次 release 版本目录下的产物，不把平台 pointer 的 key 算作产物上传
		const uploadedThisRun = uploadItems.some((item) =>
			item.key.includes(`/releases/${version}/platforms/${entryPlatformKey}/`),
		)
		if (!uploadedThisRun) continue

		const artifactUpload = uploadByBaseName.get(urlFileName)
		if (!artifactUpload || !artifactUpload.key.includes(`/${version}/`)) {
			errors.push(
				`platform ${entryPlatformKey}: 上传列表中找不到版本目录下的 ${urlFileName}`,
			)
		}

		const sigUpload = uploadByBaseName.get(`${urlFileName}.sig`)
		if (!sigUpload || !sigUpload.key.includes(`/${version}/`)) {
			errors.push(
				`platform ${entryPlatformKey}: 上传列表中找不到版本目录下的 ${urlFileName}.sig`,
			)
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
