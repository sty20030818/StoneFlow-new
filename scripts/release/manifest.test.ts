import { describe, expect, test } from 'bun:test'

import * as manifestModule from './manifest'
import { createLatestJson, createPlatformReleaseRecord } from './manifest'
import { platformReleaseJsonKey } from './paths'

const version = '0.1.4-beta.4'
const platform = 'windows-x86_64'
const updater = {
	url: `https://release.example/stoneflow/updates/beta/releases/${version}/platforms/${platform}/artifacts/updater-sha/StoneFlow_${version}_x64-setup.exe`,
	signature: 'signature',
	sha256: 'updater-sha',
}
const downloads = [{ kind: 'nsis' as const, url: updater.url, sha256: updater.sha256 }]

describe('createPlatformReleaseRecord', () => {
	test('生成无时间戳且字段顺序稳定的单平台不可变记录', () => {
		const input = {
			channel: 'beta' as const,
			version,
			commit: 'a'.repeat(40),
			sourceVersion: '0.1.3',
			platform,
			updater,
			downloads,
		}

		const record = createPlatformReleaseRecord(input)

		expect(record).toEqual({
			schemaVersion: 1,
			channel: 'beta',
			version,
			commit: 'a'.repeat(40),
			sourceVersion: '0.1.3',
			platform,
			updater,
			downloads,
		})
		expect(JSON.stringify(createPlatformReleaseRecord(input))).toBe(JSON.stringify(record))
		expect(record).not.toHaveProperty('createdAt')
		expect(record).not.toHaveProperty('updatedAt')
		expect(record).not.toHaveProperty('platforms')
	})

	test('记录 key 固定在版本与平台目录，不生成全局 manifest key', () => {
		expect(platformReleaseJsonKey('beta', version, platform)).toBe(
			`stoneflow/updates/beta/releases/${version}/platforms/${platform}/release.json`,
		)
	})
})

describe('createLatestJson', () => {
	test('只投影当前平台需要的字段且不包含 pub_date', () => {
		const latest = createLatestJson({ version, platformKey: platform, updater })

		expect(latest).toEqual({
			version,
			platforms: {
				[platform]: {
					url: updater.url,
					signature: updater.signature,
				},
			},
		})
		expect(latest).not.toHaveProperty('pub_date')
		expect(Object.keys(latest.platforms)).toEqual([platform])
	})
})

test('manifest 模块不再暴露全局 release manifest 构造器', () => {
	expect('createReleaseManifest' in manifestModule).toBeFalse()
})
