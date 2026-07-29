import { describe, expect, test } from 'bun:test'

import { assertLatestJsonConsistency } from './manifest'

describe('assertLatestJsonConsistency', () => {
	test('允许上传全局 changelog，但仍要求版本产物位于版本目录', () => {
		const version = '0.1.3-beta.4'
		const artifact = `StoneFlow_${version}_aarch64.app.tar.gz`
		const latest = {
			version,
			pub_date: '2026-07-29T00:00:00.000Z',
			platforms: {
				'darwin-aarch64': {
					signature: 'signature',
					url: `https://release.example/stoneflow/updates/beta/releases/${version}/platforms/darwin-aarch64/${artifact}`,
				},
			},
		}
		const versionKey = `stoneflow/updates/beta/releases/${version}/platforms/darwin-aarch64`
		const uploads = [
			{ filePath: '/tmp/CHANGELOG.md', key: 'stoneflow/CHANGELOG.md' },
			{ filePath: `/tmp/${artifact}`, key: `${versionKey}/${artifact}` },
			{ filePath: `/tmp/${artifact}.sig`, key: `${versionKey}/${artifact}.sig` },
		]

		expect(() => assertLatestJsonConsistency(latest, version, uploads)).not.toThrow()
		expect(() =>
			assertLatestJsonConsistency(latest, version, [
				...uploads.slice(0, 1),
				{ filePath: `/tmp/${artifact}`, key: `stoneflow/updates/beta/latest/${artifact}` },
				{ filePath: `/tmp/${artifact}.sig`, key: `stoneflow/updates/beta/latest/${artifact}.sig` },
			]),
		).toThrow(`上传 key 未落在版本目录 ${version}`)
	})

	test('追加平台时允许 latest.json 保留同版本的既有平台', () => {
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
			),
		).not.toThrow()
	})
})
