import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, test } from 'bun:test'

import { createUploadList, validateChangelog } from './release'

async function withChangelog(content: string) {
	const directory = await mkdtemp(path.join(tmpdir(), 'stoneflow-changelog-'))
	const filePath = path.join(directory, 'CHANGELOG.md')
	await writeFile(filePath, content)
	return {
		filePath,
		cleanup: () => rm(directory, { recursive: true, force: true }),
	}
}

describe('validateChangelog', () => {
	test('拒绝不合法的版本标题', async () => {
		const fixture = await withChangelog(`## [0.1] - 2026-07-29`)
		try {
			await expect(validateChangelog(fixture.filePath)).rejects.toThrow('版本标题格式错误')
		} finally {
			await fixture.cleanup()
		}
	})

	test('拒绝重复版本标题', async () => {
		const fixture = await withChangelog(`## [0.1.2] - 2026-07-29\n\n## [0.1.2] - 2026-07-30`)
		try {
			await expect(validateChangelog(fixture.filePath)).rejects.toThrow('存在重复版本')
		} finally {
			await fixture.cleanup()
		}
	})

	test('接受空版本集合和有效 beta 标题', async () => {
		const fixture = await withChangelog(
			`# StoneFlow 更新记录\n\n## [0.2.0-beta.1] - 2026-07-29\n\n- 测试内容`,
		)
		try {
			await expect(validateChangelog(fixture.filePath)).resolves.toBeUndefined()
		} finally {
			await fixture.cleanup()
		}
	})
})

describe('createUploadList', () => {
	test('先上传 changelog，最后覆盖本平台 latest.json', () => {
		const items = createUploadList({
			channel: 'beta',
			platformKey: 'darwin-aarch64',
			version: '0.2.0-beta.1',
			changelogPath: '/tmp/CHANGELOG.md',
			artifactItems: [{ filePath: '/tmp/StoneFlow.dmg', key: 'stoneflow/artifact' }],
			latestJsonPath: '/tmp/latest.json',
			latestReleasePath: '/tmp/latest.release.json',
			versionReleasePath: '/tmp/release.json',
		})

		expect(items.map((item) => item.key)).toEqual([
			'stoneflow/CHANGELOG.md',
			'stoneflow/artifact',
			'stoneflow/updates/beta/latest.release.json',
			'stoneflow/updates/beta/releases/0.2.0-beta.1/release.json',
			'stoneflow/updates/beta/platforms/darwin-aarch64/latest.json',
		])
	})
})
