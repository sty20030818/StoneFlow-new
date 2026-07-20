import { describe, expect, test } from 'bun:test'

import { resolveReleasePlan } from './release-plan'

describe('resolveReleasePlan', () => {
	test('空 beta 远端从下一个 patch 的 beta.1 开始', () => {
		expect(
			resolveReleasePlan({
				channel: 'beta',
				sourceVersion: '0.1.1',
				commit: 'abc12345',
				latestRelease: null,
			}),
		).toEqual({
			version: '0.1.2-beta.1',
			isExistingCommitRelease: false,
		})
	})

	test('同一 commit 跨平台发布时复用已有 beta 版本', () => {
		expect(
			resolveReleasePlan({
				channel: 'beta',
				sourceVersion: '0.1.1',
				commit: 'abc12345',
				latestRelease: {
					version: '0.1.2-beta.3',
					channel: 'beta',
					commit: 'abc12345',
					sourceVersion: '0.1.1',
					createdAt: '2026-07-20T00:00:00.000Z',
					platforms: {
						'windows-x86_64': { status: 'published', updatedAt: '2026-07-20T00:00:00.000Z' },
					},
				},
			}),
		).toEqual({
			version: '0.1.2-beta.3',
			isExistingCommitRelease: true,
		})
	})

	test('新 commit 在同一 beta 基线递增全局 beta 序号', () => {
		expect(
			resolveReleasePlan({
				channel: 'beta',
				sourceVersion: '0.1.1',
				commit: 'def67890',
				latestRelease: {
					version: '0.1.2-beta.3',
					channel: 'beta',
					commit: 'abc12345',
					sourceVersion: '0.1.1',
					createdAt: '2026-07-20T00:00:00.000Z',
					platforms: {},
				},
			}),
		).toEqual({
			version: '0.1.2-beta.4',
			isExistingCommitRelease: false,
		})
	})

	test('禁止同一版本绑定到不同 commit', () => {
		expect(() =>
			resolveReleasePlan({
				channel: 'stable',
				sourceVersion: '0.1.1',
				commit: 'def67890',
				latestRelease: {
					version: '0.1.1',
					channel: 'stable',
					commit: 'abc12345',
					sourceVersion: '0.1.1',
					createdAt: '2026-07-20T00:00:00.000Z',
					platforms: {},
				},
			}),
		).toThrow('已绑定到 commit')
	})
})
