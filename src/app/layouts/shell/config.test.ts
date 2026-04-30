import {
	getScopeLabel,
	getSectionLabel,
	getSpaceLabel,
	resolveShellSection,
} from '@/app/layouts/shell/config'

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
	it('按路由解析主分区', () => {
		expect(resolveShellSection('/spaces/focus')).toBe('views')
		expect(resolveShellSection('/spaces/views')).toBe('views')
		expect(resolveShellSection('/space/space-personal/all-tasks')).toBe('allTasks')
		expect(resolveShellSection('/space/space-personal/projects')).toBe('projects')
		expect(resolveShellSection('/space/space-personal/project/stoneflow-v1')).toBe('project')
		expect(resolveShellSection('/space/space-personal/archive')).toBe('archive')
		expect(resolveShellSection('/space/space-personal/trash')).toBe('trash')
		expect(resolveShellSection('/space/space-personal/settings')).toBe('settings')
		expect(resolveShellSection('/spaces/inbox')).toBe('inbox')
	})

	it('为已知分区和空间返回标签', () => {
		expect(getSectionLabel('inbox')).toBe('Inbox')
		expect(getSectionLabel('allTasks')).toBe('All Tasks')
		expect(getSectionLabel('views')).toBe('Views')
		expect(getSectionLabel('projects')).toBe('Project Overview')
		expect(getSectionLabel('archive')).toBe('Archive')
		expect(getSectionLabel('settings')).toBe('Settings')
		expect(getSpaceLabel('space-personal', spaces)).toBe('个人')
		expect(getScopeLabel({ type: 'all' }, spaces)).toBe('全部 Spaces')
		expect(getScopeLabel({ type: 'space', spaceId: 'space-personal' }, spaces)).toBe('个人')
	})

	it('为未知值返回兜底标签', () => {
		expect(getSectionLabel('unknown' as never)).toBe('Workspace')
		expect(getSpaceLabel('unknown-space')).toBe('unknown-space')
	})
})
