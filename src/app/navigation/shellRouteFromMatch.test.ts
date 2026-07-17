import { shellRouteFromMatch } from '@/app/navigation/shellRouteFromMatch'
import { parseShellRoute } from '@/app/navigation/shellRouteParse'

describe('shellRouteFromMatch', () => {
	it('用 layout scope + params 投影任务详情', () => {
		const route = shellRouteFromMatch({
			scope: { type: 'space', spaceId: 'space-a' },
			pathname: '/space-a/tasks/task-1',
			params: { scopeKey: 'space-a', taskId: 'task-1' },
		})

		expect(route.kind).toBe('task')
		expect(route.scope).toEqual({ type: 'space', spaceId: 'space-a' })
		expect(route.taskId).toBe('task-1')
		expect(route.section).toBe('tasks')
		expect(route.isWorkPath).toBe(true)
	})

	it('all 作用域不把 projects/:id 当成详情（仅 space 详情）', () => {
		const route = shellRouteFromMatch({
			scope: { type: 'all' },
			pathname: '/all/projects/project-9',
			params: { scopeKey: 'all', projectId: 'project-9' },
		})

		// match 有 projectId 但 scope=all → 不投影为 project kind
		expect(route.kind).toBe('unknown')
	})

	it('settings section 来自 params', () => {
		const route = shellRouteFromMatch({
			scope: { type: 'all' },
			pathname: '/all/settings/sync',
			params: { scopeKey: 'all', section: 'sync' },
		})

		expect(route.isSettingsPath).toBe(true)
		expect(route.settingsSection).toBe('sync')
		expect(route.section).toBe('settings')
	})

	it('与字符串 parse 在常见 section 路径上语义一致', () => {
		const path = '/space-a/inbox'
		const fromMatch = shellRouteFromMatch({
			scope: { type: 'space', spaceId: 'space-a' },
			pathname: path,
			params: { scopeKey: 'space-a' },
		})
		const fromParse = parseShellRoute(path)

		expect(fromMatch.kind).toBe(fromParse.kind)
		expect(fromMatch.section).toBe(fromParse.section)
		expect(fromMatch.scope).toEqual(fromParse.scope)
	})
})

describe('parseShellRoute S1', () => {
	it('all 下 projects/:id 为 unknown（详情不挂 all）', () => {
		const route = parseShellRoute('/all/projects/p1')
		expect(route.kind).toBe('unknown')
	})

	it('识别 space 任务详情', () => {
		const route = parseShellRoute('/s1/tasks/t1')
		expect(route.kind).toBe('task')
		expect(route.taskId).toBe('t1')
		expect(route.spaceId).toBe('s1')
	})
})
