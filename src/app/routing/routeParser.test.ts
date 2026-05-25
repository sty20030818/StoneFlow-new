import {
	isProjectShellPath,
	isShellPath,
	parseShellRoute,
	parseShellScopePath,
	resolveShellPathKind,
	resolveShellSection,
} from './routeParser'

const OLD_SPACE_PATH = `/${'space'}/space-a/inbox`
const OLD_PROJECT_SHELL_PATH = `/${'space'}/space-a/project/project-a`
const OLD_NO_PROJECT_PATH = `/${'space'}/space-a/no-project`
const TASK_SHORTCUT_PATH = `/${'tasks'}/task-a`
const PROJECT_SHORTCUT_PATH = `/${'projects'}/project-a`

describe('routeParser', () => {
	it('解析 canonical shell section', () => {
		expect(resolveShellSection('/all/views')).toBe('views')
		expect(resolveShellSection('/spaces/space-personal/inbox')).toBe('inbox')
		expect(resolveShellSection('/spaces/space-personal/all-tasks')).toBe('allTasks')
		expect(resolveShellSection('/spaces/space-personal/no-project')).toBe('noProject')
		expect(resolveShellSection('/spaces/space-personal/projects')).toBe('projects')
		expect(resolveShellSection('/spaces/space-personal/project/stoneflow-v1')).toBe('project')
		expect(resolveShellSection('/spaces/space-personal/archive')).toBe('archive')
		expect(resolveShellSection('/spaces/space-personal/trash')).toBe('trash')
		expect(resolveShellSection('/spaces/space-personal/settings')).toBe('settings')
		expect(resolveShellSection('/spaces/space-personal/tasks/task-a')).toBe('allTasks')
		expect(resolveShellSection('/spaces/space-personal/projects/project-a/detail')).toBe('project')
	})

	it('只识别 canonical scope 和 path kind', () => {
		expect(parseShellScopePath('/all/views')).toEqual({ type: 'all' })
		expect(parseShellScopePath('/spaces/space-a/inbox')).toEqual({
			type: 'space',
			spaceId: 'space-a',
		})
		expect(parseShellScopePath('/spaces/space-a/tasks/task-a')).toEqual({
			type: 'space',
			spaceId: 'space-a',
		})
		expect(parseShellScopePath('/spaces/space-a/projects/project-a/detail')).toEqual({
			type: 'space',
			spaceId: 'space-a',
		})

		expect(parseShellScopePath('/spaces/views')).toBeNull()
		expect(parseShellScopePath(OLD_SPACE_PATH)).toBeNull()
		expect(parseShellScopePath(TASK_SHORTCUT_PATH)).toBeNull()
		expect(parseShellScopePath(PROJECT_SHORTCUT_PATH)).toBeNull()

		expect(resolveShellPathKind('/all/views')).toBe('canonical-all')
		expect(resolveShellPathKind('/spaces/space-a/project/project-a')).toBe('canonical-space')
		expect(resolveShellPathKind('/spaces/views')).toBe('other')
		expect(resolveShellPathKind(OLD_PROJECT_SHELL_PATH)).toBe('other')
		expect(resolveShellPathKind(TASK_SHORTCUT_PATH)).toBe('other')
		expect(resolveShellPathKind(PROJECT_SHORTCUT_PATH)).toBe('other')
	})

	it('识别 canonical project shell path', () => {
		expect(isProjectShellPath('/spaces/space-a/project/project-a')).toBe(true)
		expect(isProjectShellPath('/spaces/space-a/projects/project-a/detail')).toBe(true)
		expect(isProjectShellPath(OLD_PROJECT_SHELL_PATH)).toBe(false)
		expect(isShellPath('/all/inbox')).toBe(true)
		expect(isShellPath('/spaces/space-a/inbox')).toBe(true)
		expect(isShellPath('/spaces/inbox')).toBe(false)
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

		expect(parseShellRoute(OLD_NO_PROJECT_PATH)).toMatchObject({
			scope: null,
			pathKind: 'other',
			isShellPath: false,
		})

		expect(parseShellRoute(TASK_SHORTCUT_PATH)).toMatchObject({
			scope: null,
			entityPageTarget: null,
			pathKind: 'other',
			isShellPath: false,
		})
	})
})
