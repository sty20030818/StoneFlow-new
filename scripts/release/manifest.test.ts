import { describe, expect, test } from 'bun:test'

import { assertLatestJsonConsistency } from './manifest'

describe('assertLatestJsonConsistency', () => {
	test('追加平台时允许 latest.json 保留同版本的既有平台', () => {
		expect(() =>
			assertLatestJsonConsistency(
				{
					version: '0.1.2-beta.3',
					notes: '',
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
