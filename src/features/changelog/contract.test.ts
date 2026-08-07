import { describe, expect, it } from 'vitest'

import bundledChangelog from '../../../CHANGELOG.md?raw'
import {
	ChangelogContractError,
	compareChangelogVersions,
	getPublishableRelease,
	parseChangelogDocument,
	selectChangelogHistory,
	selectChangelogRange,
} from './contract'

function release(
	version: string,
	options: { body?: string; date?: string; yanked?: boolean } = {},
) {
	const { body = '### Added\n\n- 用户可见变化', date = '2026-08-01', yanked = false } = options
	return `## [${version}] - ${date}${yanked ? ' [YANKED]' : ''}\n\n${body}`
}

function changelog(releases: string, unreleased = '') {
	return `# StoneFlow 更新日志\n\n遵循 Keep a Changelog。\n\n## [Unreleased]\n\n${unreleased}${unreleased ? '\n\n' : ''}${releases}`
}

function versions(releases: readonly { version: string }[]) {
	return releases.map((item) => item.version)
}

describe('changelog contract', () => {
	it('解析规范分类、YANKED、footer 与代码围栏，并兼容 BOM/CRLF', () => {
		const fencedBody = [
			'### Fixed',
			'',
			'- 修复问题',
			'',
			'### Added',
			'',
			'```text',
			'## [9.9.9] - 2099-01-01',
			'### Security',
			'[1.2.0]: https://fake.example',
			'```',
			'',
			'> ## [8.8.8] - 2099-01-01',
			'    ### Changed',
		].join('\n')
		const source = `${changelog(
			[
				release('1.2.0', { body: fencedBody, date: '2024-02-29' }),
				release('1.2.0-beta.10', { yanked: true }),
			].join('\n\n'),
			'### Changed\n\n- 尚未发布',
		)}\n\n[Unreleased]: https://example.com/compare/v1.2.0...HEAD\n[1.2.0]: https://example.com/releases/1.2.0\n`

		const document = parseChangelogDocument(source)
		expect(document.unreleased.get('Changed')).toBe('- 尚未发布')
		expect(versions(document.releases)).toEqual(['1.2.0', '1.2.0-beta.10'])
		expect(document.releases[0].sections.get('Added')).toContain('## [9.9.9]')
		expect(document.releases[0].sections.get('Added')).toContain('[1.2.0]: https://fake.example')
		expect(document.releases[0].sections.get('Added')).not.toContain('[Unreleased]:')
		expect(document.releases[1].yanked).toBe(true)
		expect(parseChangelogDocument(`\uFEFF${source.replaceAll('\n', '\r\n')}`)).toEqual(document)
	})

	it('根 CHANGELOG.md 满足契约并保留首发说明', () => {
		const document = parseChangelogDocument(bundledChangelog)
		expect(document.releases.at(-1)?.version).toBe('0.1.0')
		expect(document.releases.at(-1)?.sections.get('Added')).toContain(
			'StoneFlow 首个公开发布版本。',
		)
	})

	it.each([
		'01.2.3',
		'1.02.3',
		'1.2.03',
		'1.2.3-beta.0',
		'1.2.3-beta.01',
		'1.2.3-beta',
		'1.2.3-alpha.1',
		'1.2.3-rc.1',
		'1.2.3+build.1',
		'1.2.3-beta.1+build.1',
		'v1.2.3',
		'1.2.3.4',
	])('拒绝不受支持的版本标题：%s', (version) => {
		expect(() => parseChangelogDocument(changelog(release(version)))).toThrow(/版本标题/)
	})

	it.each(['2026-8-06', '2026-08-6', '2026-13-01', '2026-04-31', '2026-02-29'])(
		'拒绝无效 ISO 日期：%s',
		(date) => {
			expect(() => parseChangelogDocument(changelog(release('1.0.0', { date })))).toThrow(/日期/)
		},
	)

	it.each([
		['缺少 Unreleased', release('1.0.0')],
		['首个 H2 不是 Unreleased', `# 日志\n\n${release('1.0.0')}\n\n## [Unreleased]\n`],
		['重复 Unreleased', `${changelog(release('1.0.0'))}\n\n## [Unreleased]\n`],
		['Unreleased 裸正文', changelog(release('1.0.0'), '尚未发布')],
		['版本裸正文', changelog(release('1.0.0', { body: '未归类正文\n\n### Added\n\n- 变化' }))],
		['版本没有分类', changelog(release('1.0.0', { body: '' }))],
		['未知分类', changelog(release('1.0.0', { body: '### 新增\n\n- 变化' }))],
		['空分类', changelog(release('1.0.0', { body: '### Added\n\n### Fixed\n\n- 修复' }))],
		['重复分类', changelog(release('1.0.0', { body: '### Added\n\n- A\n\n### Added\n\n- B' }))],
		['未知 H2', `${changelog(release('1.0.0'))}\n\n## Notes\n\n- 非法内容`],
		[
			'footer 后还有正文',
			`${changelog(release('1.0.0'))}\n\n[1.0.0]: https://example.com/1.0.0\n\n- 非法内容`,
		],
	])('拒绝非法文档结构：%s', (_label, source) => {
		expect(() => parseChangelogDocument(source)).toThrow(ChangelogContractError)
	})

	it('拒绝重复或未严格降序的版本', () => {
		const duplicate = changelog([release('1.0.0'), release('1.0.0')].join('\n\n'))
		const betaOrder = changelog([release('1.0.0-beta.9'), release('1.0.0-beta.10')].join('\n\n'))
		const stableAfterBeta = changelog([release('1.0.0-beta.2'), release('1.0.0')].join('\n\n'))

		expect(() => parseChangelogDocument(duplicate)).toThrow(/重复版本/)
		expect(() => parseChangelogDocument(betaOrder)).toThrow(/新到旧/)
		expect(() => parseChangelogDocument(stableAfterBeta)).toThrow(/新到旧/)
	})

	it('使用任意精度整数比较 Stable 与 Beta 版本', () => {
		expect(
			compareChangelogVersions('9007199254740993.0.0', '9007199254740992.0.0'),
		).toBeGreaterThan(0)
		expect(
			compareChangelogVersions('1.0.0-beta.9007199254740993', '1.0.0-beta.9007199254740992'),
		).toBeGreaterThan(0)
		expect(compareChangelogVersions('1.0.0', '1.0.0-beta.999')).toBeGreaterThan(0)
	})

	it('发布目标必须存在、合法且未撤回', () => {
		const document = parseChangelogDocument(
			changelog([release('1.0.0'), release('1.0.0-beta.1', { yanked: true })].join('\n\n')),
		)
		expect(getPublishableRelease(document, '1.0.0').version).toBe('1.0.0')
		expect(() => getPublishableRelease(document, '1.0.1')).toThrow(/不存在/)
		expect(() => getPublishableRelease(document, 'Unreleased')).toThrow(/目标版本/)
		expect(() => getPublishableRelease(document, '1.0.0-beta.1')).toThrow(/YANKED/)
	})

	it('按渠道选择开区间下界、闭区间上界，并排除 YANKED', () => {
		const document = parseChangelogDocument(
			changelog(
				[
					release('2.0.0'),
					release('2.0.0-beta.4'),
					release('2.0.0-beta.3'),
					release('2.0.0-beta.2', { yanked: true }),
					release('2.0.0-beta.1'),
					release('1.9.1'),
					release('1.9.1-beta.2'),
					release('1.9.1-beta.1'),
					release('1.9.0'),
				].join('\n\n'),
			),
		)

		expect(
			versions(
				selectChangelogRange(document, {
					channel: 'stable',
					currentVersion: '1.9.0',
					targetVersion: '2.0.0',
				}),
			),
		).toEqual(['2.0.0', '1.9.1'])
		expect(
			versions(
				selectChangelogRange(document, {
					channel: 'beta',
					currentVersion: '2.0.0-beta.1',
					targetVersion: '2.0.0-beta.4',
				}),
			),
		).toEqual(['2.0.0-beta.4', '2.0.0-beta.3'])
		expect(
			versions(
				selectChangelogRange(document, {
					channel: 'beta',
					currentVersion: '1.9.1-beta.2',
					targetVersion: '2.0.0-beta.1',
				}),
			),
		).toEqual(['2.0.0-beta.1', '1.9.1'])
		expect(
			selectChangelogRange(document, {
				channel: 'beta',
				currentVersion: '2.0.0-beta.4',
				targetVersion: '2.0.0-beta.4',
			}),
		).toEqual([])
		expect(
			selectChangelogRange(document, {
				channel: 'beta',
				currentVersion: '2.0.0-beta.4',
				targetVersion: '2.0.0-beta.3',
			}),
		).toEqual([])
	})

	it('跨平台跳过版本只依赖版本区间，缺失中间条目时返回其余有效条目', () => {
		const complete = parseChangelogDocument(
			changelog(
				[release('0.1.2-beta.4'), release('0.1.2-beta.3'), release('0.1.2-beta.2')].join('\n\n'),
			),
		)
		const missingMiddle = parseChangelogDocument(
			changelog([release('0.1.2-beta.4'), release('0.1.2-beta.2')].join('\n\n')),
		)
		const query = {
			channel: 'beta' as const,
			currentVersion: '0.1.2-beta.2',
			targetVersion: '0.1.2-beta.4',
		}

		expect(versions(selectChangelogRange(complete, query))).toEqual([
			'0.1.2-beta.4',
			'0.1.2-beta.3',
		])
		expect(versions(selectChangelogRange(missingMiddle, query))).toEqual(['0.1.2-beta.4'])
	})

	it('区间拒绝非法或渠道不一致的边界，历史视图保留 YANKED', () => {
		const document = parseChangelogDocument(
			changelog(
				[release('1.1.0'), release('1.1.0-beta.1', { yanked: true }), release('1.0.0')].join(
					'\n\n',
				),
			),
		)

		expect(() =>
			selectChangelogRange(document, {
				channel: 'stable',
				currentVersion: '1.0.0',
				targetVersion: '1.1.0-beta.1',
			}),
		).toThrow(/渠道/)
		expect(() =>
			selectChangelogRange(document, {
				channel: 'beta',
				currentVersion: 'invalid',
				targetVersion: '1.1.0-beta.1',
			}),
		).toThrow(/版本/)
		expect(versions(selectChangelogHistory(document, 'stable'))).toEqual(['1.1.0', '1.0.0'])
		expect(versions(selectChangelogHistory(document, 'beta'))).toEqual([
			'1.1.0',
			'1.1.0-beta.1',
			'1.0.0',
		])
	})
})
