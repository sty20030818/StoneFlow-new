import { isProjectShellPath, isProjectShortcutPath, isTaskShortcutPath, parseShellScopePath, resolveShellPathKind, resolveShellSection } from './routeParser'

describe('routeParser', () => {
	it('按旧路由解析 shell section', () => {
		expect(resolveShellSection('/spaces/focus')).toBe('views')
		expect(resolveShellSection('/spaces/views')).toBe('views')
		expect(resolveShellSection('/projects/project-shortcut')).toBe('project')
		expect(resolveShellSection('/space/space-personal/all-tasks')).toBe('allTasks')
		expect(resolveShellSection('/space/space-personal/no-project')).toBe('noProject')
		expect(resolveShellSection('/space/space-personal/projects')).toBe('projects')
		expect(resolveShellSection('/space/space-personal/project/stoneflow-v1')).toBe('project')
		expect(resolveShellSection('/space/space-personal/archive')).toBe('archive')
		expect(resolveShellSection('/space/space-personal/trash')).toBe('trash')
		expect(resolveShellSection('/space/space-personal/settings')).toBe('settings')
		expect(resolveShellSection('/spaces/inbox')).toBe('inbox')
	})

	it('识别 scope 和 path kind', () => {
		expect(parseShellScopePath('/spaces/views')).toEqual({ type: 'all' })
		expect(parseShellScopePath('/space/space-a/inbox')).toEqual({ type: 'space', spaceId: 'space-a' })
		expect(resolveShellPathKind('/spaces/views')).toBe('all')
		expect(resolveShellPathKind('/space/space-a/project/project-a')).toBe('space')
		expect(resolveShellPathKind('/tasks/task-a')).toBe('task-shortcut')
		expect(resolveShellPathKind('/projects/project-a')).toBe('project-shortcut')
	})

	it('识别 project shell 与 entity shortcut path', () => {
		expect(isProjectShellPath('/space/space-a/project/project-a')).toBe(true)
		expect(isTaskShortcutPath('/tasks/task-a')).toBe(true)
		expect(isTaskShortcutPath('/tasks/task-a/extra')).toBe(false)
		expect(isProjectShortcutPath('/projects/project-a')).toBe(true)
	})
})
