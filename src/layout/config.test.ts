import { getScopeLabel, getSectionLabel, getSpaceLabel } from '@/layout/config'

const spaces = [
	{
		id: 'space-personal',
		name: '个人',
		iconKey: 'user',
		colorKey: 'blue',
		isDefault: true,
		position: 100,
		archivedAt: null,
		deletedAt: null,
		createdAt: '2026-04-30T00:00:00.000Z',
		updatedAt: '2026-04-30T00:00:00.000Z',
	},
]

describe('shell config helpers', () => {
	it('为已知分区和空间返回标签', () => {
		expect(getSectionLabel('standalone')).toBe('独立事项')
		expect(getSectionLabel('tasks')).toBe('所有任务')
		expect(getSectionLabel('views')).toBe('视图')
		expect(getSectionLabel('projects')).toBe('项目总览')
		expect(getSectionLabel('archive')).toBe('归档')
		expect(getSectionLabel('settings')).toBe('设置')
		expect(getSpaceLabel('space-personal', spaces)).toBe('个人')
		expect(getScopeLabel({ type: 'all' }, spaces)).toBe('所有空间')
		expect(getScopeLabel({ type: 'space', spaceId: 'space-personal' }, spaces)).toBe('个人')
	})

	it('为未知值返回兜底标签', () => {
		expect(getSectionLabel('unknown' as never)).toBe('工作区')
		expect(getSpaceLabel('unknown-space')).toBe('unknown-space')
	})
})
