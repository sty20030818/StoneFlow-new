import { isProjectShellPath, isProjectShortcutPath, isTaskShortcutPath, parseShellRoute, parseShellScopePath, resolveShellPathKind, resolveShellSection } from './routeParser'

describe('routeParser', () => {
	it('同时支持 canonical 与 legacy shell section 解析', () => {
		expect(resolveShellSection('/all/views')).toBe('views')
		expect(resolveShellSection('/spaces/space-personal/inbox')).toBe('inbox')
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
		expect(resolveShellSection('/spaces/space-personal/tasks/task-a')).toBe('allTasks')
		expect(resolveShellSection('/spaces/space-personal/projects/project-a/detail')).toBe('project')
	})

	it('识别 scope 和 path kind', () => {
		expect(parseShellScopePath('/all/views')).toEqual({ type: 'all' })
		expect(parseShellScopePath('/spaces/space-a/inbox')).toEqual({ type: 'space', spaceId: 'space-a' })
		expect(parseShellScopePath('/spaces/views')).toEqual({ type: 'all' })
		expect(parseShellScopePath('/space/space-a/inbox')).toEqual({ type: 'space', spaceId: 'space-a' })
		expect(parseShellScopePath('/spaces/space-a/tasks/task-a')).toEqual({
			type: 'space',
			spaceId: 'space-a',
		})
		expect(parseShellScopePath('/spaces/space-a/projects/project-a/detail')).toEqual({
			type: 'space',
			spaceId: 'space-a',
		})
		expect(resolveShellPathKind('/all/views')).toBe('canonical-all')
		expect(resolveShellPathKind('/spaces/space-a/project/project-a')).toBe('canonical-space')
		expect(resolveShellPathKind('/spaces/views')).toBe('legacy-all')
		expect(resolveShellPathKind('/space/space-a/project/project-a')).toBe('legacy-space')
		expect(resolveShellPathKind('/tasks/task-a')).toBe('task-shortcut')
		expect(resolveShellPathKind('/projects/project-a')).toBe('project-shortcut')
	})

	it('识别 project shell 与 entity shortcut path', () => {
		expect(isProjectShellPath('/spaces/space-a/project/project-a')).toBe(true)
		expect(isProjectShellPath('/spaces/space-a/projects/project-a/detail')).toBe(true)
		expect(isProjectShellPath('/space/space-a/project/project-a')).toBe(true)
		expect(isTaskShortcutPath('/tasks/task-a')).toBe(true)
		expect(isTaskShortcutPath('/tasks/task-a/extra')).toBe(false)
		expect(isProjectShortcutPath('/projects/project-a')).toBe(true)
	})

	it('解析结构化 shell route', () => {
		expect(parseShellRoute('/all/inbox?task=task-a#top')).toMatchObject({
			scope: { type: 'all' },
			spaceId: null,
			section: 'inbox',
			projectId: null,
			pathKind: 'canonical-all',
			pathname: '/all/inbox',
			search: '?task=task-a',
			hash: '#top',
			fullPath: '/all/inbox?task=task-a#top',
			isShellPath: true,
		})

		expect(parseShellRoute('/spaces/space-a/project/project-a')).toMatchObject({
			scope: { type: 'space', spaceId: 'space-a' },
			spaceId: 'space-a',
			section: 'project',
			projectId: 'project-a',
			pathKind: 'canonical-space',
			isShellPath: true,
		})

		expect(parseShellRoute('/spaces/space-a/tasks/task-a')).toMatchObject({
			scope: { type: 'space', spaceId: 'space-a' },
			spaceId: 'space-a',
			section: 'allTasks',
			projectId: null,
			entityPageTarget: { kind: 'task', id: 'task-a', spaceId: 'space-a' },
			pathKind: 'canonical-space',
			isShellPath: true,
		})

		expect(parseShellRoute('/spaces/space-a/projects/project-a/detail')).toMatchObject({
			scope: { type: 'space', spaceId: 'space-a' },
			spaceId: 'space-a',
			section: 'project',
			projectId: 'project-a',
			entityPageTarget: { kind: 'project', id: 'project-a', spaceId: 'space-a' },
			pathKind: 'canonical-space',
			isShellPath: true,
		})

		expect(parseShellRoute('/space/space-a/no-project')).toMatchObject({
			scope: { type: 'space', spaceId: 'space-a' },
			section: 'noProject',
			pathKind: 'legacy-space',
			isShellPath: true,
		})

		expect(parseShellRoute('/tasks/task-a')).toMatchObject({
			scope: null,
			section: 'inbox',
			entityPageTarget: null,
			pathKind: 'task-shortcut',
			isShellPath: false,
		})
	})
})
