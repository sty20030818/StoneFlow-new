import { parseShellRoute, shellRouteFromMatch } from './shellLocation'

describe('shellLocation', () => {
	it('fromMatch 任务详情', () => {
		const route = shellRouteFromMatch({
			scope: { type: 'space', spaceId: 'space-a' },
			pathname: '/space-a/tasks/task-1',
			params: { scopeKey: 'space-a', taskId: 'task-1' },
		})
		expect(route.kind).toBe('task')
		expect(route.taskId).toBe('task-1')
	})

	it('parse settings', () => {
		const route = parseShellRoute('/all/settings/sync')
		expect(route.isSettingsPath).toBe(true)
		expect(route.settingsSection).toBe('sync')
	})

	it('all 下 projects/:id 为 unknown', () => {
		expect(parseShellRoute('/all/projects/p1').kind).toBe('unknown')
	})

	it('space 任务详情', () => {
		const route = parseShellRoute('/s1/tasks/t1')
		expect(route.kind).toBe('task')
		expect(route.spaceId).toBe('s1')
	})
})
