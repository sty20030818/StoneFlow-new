import { getScopeLabel, getSectionLabel, getSpaceLabel } from '@/app/layouts/shell/config'
import { resolveShellSection } from '@/app/routing'

const spaces = [
	{
		id: 'space-personal',
		name: '个人',
		iconKey: 'user',
		colorKey: 'blue',
		isDefault: true,
		sortOrder: 100,
		archivedAt: null,
		deletedAt: null,
		createdAt: '2026-04-30T00:00:00.000Z',
		updatedAt: '2026-04-30T00:00:00.000Z',
	},
]

describe('shell config helpers', () => {
	it('routing 按 canonical 路由解析主分区', () => {
		expect(resolveShellSection('/all/views')).toBe('views')
		expect(resolveShellSection('/spaces/space-personal/inbox')).toBe('inbox')
		expect(resolveShellSection('/spaces/space-personal/all-tasks')).toBe('allTasks')
		expect(resolveShellSection('/spaces/space-personal/no-project')).toBe('noProject')
		expect(resolveShellSection('/spaces/space-personal/projects')).toBe('projects')
		expect(resolveShellSection('/spaces/space-personal/project/stoneflow-v1')).toBe('project')
		expect(resolveShellSection('/spaces/space-personal/archive')).toBe('archive')
		expect(resolveShellSection('/spaces/space-personal/trash')).toBe('trash')
		expect(resolveShellSection('/spaces/space-personal/settings')).toBe('settings')
	})

	it('为已知分区和空间返回标签', () => {
		expect(getSectionLabel('inbox')).toBe('收件箱')
		expect(getSectionLabel('allTasks')).toBe('所有任务')
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
