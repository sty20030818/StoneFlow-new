import { describe, expect, it } from 'vitest'

import { findChangelogEntry, parseChangelog, visibleChangelogEntries } from './model'

const CONTENT = `# StoneFlow 更新日志

## [0.2.0] - 2026-07-30

### ✨ 新功能
- 正式版变化

## [0.3.0-beta.2] - 2026-07-31

### 🧪 测试
- Beta 变化

## [0.3.0-beta.1] - 2026-07-30

- 更早的 Beta`

describe('changelog model', () => {
	it('stable 只显示正式版，beta 按语义版本倒序显示全部版本', () => {
		const entries = parseChangelog(CONTENT)
		expect(visibleChangelogEntries(entries, 'stable').map((entry) => entry.version)).toEqual([
			'0.2.0',
		])
		expect(visibleChangelogEntries(entries, 'beta').map((entry) => entry.version)).toEqual([
			'0.3.0-beta.2',
			'0.3.0-beta.1',
			'0.2.0',
		])
	})

	it('按目标版本返回独立条目', () => {
		const entries = parseChangelog(CONTENT)
		expect(findChangelogEntry(entries, '0.3.0-beta.2')?.content).toContain('Beta 变化')
	})
})
