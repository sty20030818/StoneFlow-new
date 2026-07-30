import { describe, expect, test } from 'bun:test'

import { assertLatestJsonConsistency, createLatestJson } from './manifest'

describe('createLatestJson', () => {
	test('只写入当前平台，不跨平台 merge', () => {
		const latest = createLatestJson({
			version: '0.1.3-beta.4',
			pubDate: '2026-07-30T00:00:00.000Z',
			platformKey: 'darwin-aarch64',
			platforms: {
				'darwin-aarch64': {
					signature: 'sig',
					url: 'https://release.example/stoneflow/updates/beta/releases/0.1.3-beta.4/platforms/darwin-aarch64/StoneFlow_0.1.3-beta.4_aarch64.app.tar.gz',
				},
				'windows-x86_64': {
					signature: 'other',
					url: 'https://release.example/stoneflow/updates/beta/releases/0.1.3-beta.5/platforms/windows-x86_64/StoneFlow_0.1.3-beta.5_x64-setup.exe',
				},
			},
		})

		expect(latest).toEqual({
			version: '0.1.3-beta.4',
			pub_date: '2026-07-30T00:00:00.000Z',
			platforms: {
				'darwin-aarch64': {
					signature: 'sig',
					url: 'https://release.example/stoneflow/updates/beta/releases/0.1.3-beta.4/platforms/darwin-aarch64/StoneFlow_0.1.3-beta.4_aarch64.app.tar.gz',
				},
			},
		})
	})

	test('缺少当前平台时失败', () => {
		expect(() =>
			createLatestJson({
				version: '0.1.3-beta.4',
				pubDate: '2026-07-30T00:00:00.000Z',
				platformKey: 'darwin-aarch64',
				platforms: {
					'windows-x86_64': {
						signature: 'sig',
						url: 'https://example/win.exe',
					},
				},
			}),
		).toThrow('缺少当前平台')
	})
})

describe('assertLatestJsonConsistency', () => {
	test('允许上传全局 changelog，但仍要求版本产物位于版本目录', () => {
		const version = '0.1.3-beta.4'
		const artifact = `StoneFlow_${version}_aarch64.app.tar.gz`
		const platformKey = 'darwin-aarch64'
		const latest = {
			version,
			pub_date: '2026-07-29T00:00:00.000Z',
			platforms: {
				[platformKey]: {
					signature: 'signature',
					url: `https://release.example/stoneflow/updates/beta/releases/${version}/platforms/${platformKey}/${artifact}`,
				},
			},
		}
		const versionKey = `stoneflow/updates/beta/releases/${version}/platforms/${platformKey}`
		const uploads = [
			{ filePath: '/tmp/CHANGELOG.md', key: 'stoneflow/CHANGELOG.md' },
			{ filePath: `/tmp/${artifact}`, key: `${versionKey}/${artifact}` },
			{ filePath: `/tmp/${artifact}.sig`, key: `${versionKey}/${artifact}.sig` },
			{
				filePath: '/tmp/latest.json',
				key: `stoneflow/updates/beta/platforms/${platformKey}/latest.json`,
			},
		]

		expect(() =>
			assertLatestJsonConsistency(latest, version, uploads, platformKey),
		).not.toThrow()
		expect(() =>
			assertLatestJsonConsistency(
				latest,
				version,
				[
					...uploads.slice(0, 1),
					{ filePath: `/tmp/${artifact}`, key: `stoneflow/updates/beta/latest/${artifact}` },
					{
						filePath: `/tmp/${artifact}.sig`,
						key: `stoneflow/updates/beta/latest/${artifact}.sig`,
					},
				],
				platformKey,
			),
		).toThrow(`上传 key 未落在版本目录 ${version}`)
	})

	test('拒绝把多平台塞进单平台 latest.json', () => {
		expect(() =>
			assertLatestJsonConsistency(
				{
					version: '0.1.2-beta.3',
					pub_date: '2026-07-20T00:00:00.000Z',
					platforms: {
						'windows-x86_64': {
							signature: 'old-signature',
							url: 'https://release.example/stoneflow/updates/beta/releases/0.1.2-beta.3/platforms/windows-x86_64/StoneFlow_0.1.2-beta.3_x64-setup.exe',
						},
						'darwin-aarch64': {
							signature: 'new-signature',
							url: 'https://release.example/stoneflow/updates/beta/releases/0.1.2-beta.3/platforms/darwin-aarch64/StoneFlow_0.1.2-beta.3_aarch64.app.tar.gz',
						},
					},
				},
				'0.1.2-beta.3',
				[
					{
						filePath: '/tmp/StoneFlow_0.1.2-beta.3_aarch64.app.tar.gz',
						key: 'stoneflow/updates/beta/releases/0.1.2-beta.3/platforms/darwin-aarch64/StoneFlow_0.1.2-beta.3_aarch64.app.tar.gz',
					},
					{
						filePath: '/tmp/StoneFlow_0.1.2-beta.3_aarch64.app.tar.gz.sig',
						key: 'stoneflow/updates/beta/releases/0.1.2-beta.3/platforms/darwin-aarch64/StoneFlow_0.1.2-beta.3_aarch64.app.tar.gz.sig',
					},
				],
				'darwin-aarch64',
			),
		).toThrow('必须仅包含当前平台')
	})
})
