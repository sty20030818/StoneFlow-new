import { buildProjectShortcutPath, buildScopedProjectPath, buildScopedSectionPath, buildStartupFallbackPath, buildTaskShortcutPath } from './routePaths'

describe('routePaths', () => {
	it('构建 all scope section path', () => {
		expect(buildScopedSectionPath({ type: 'all' }, 'inbox')).toBe('/spaces/inbox')
		expect(buildScopedSectionPath({ type: 'all' }, 'projects')).toBe('/spaces/projects')
	})

	it('构建 space scope section path 与 fallback space', () => {
		expect(buildScopedSectionPath({ type: 'space', spaceId: 'space-a' }, 'all-tasks')).toBe(
			'/space/space-a/all-tasks',
		)
		expect(buildScopedSectionPath({ type: 'space', spaceId: '' as never }, 'views', 'space-fallback')).toBe(
			'/space/space-fallback/views',
		)
	})

	it('构建 scoped project path', () => {
		expect(buildScopedProjectPath({ type: 'space', spaceId: 'space-a' }, 'project-a')).toBe(
			'/space/space-a/project/project-a',
		)
		expect(buildScopedProjectPath({ type: 'all' }, undefined, 'space-a')).toBe('/spaces/projects')
	})

	it('构建 entity shortcut path', () => {
		expect(buildTaskShortcutPath('task/a')).toBe('/tasks/task%2Fa')
		expect(buildProjectShortcutPath('project-a')).toBe('/projects/project-a')
	})

	it('构建 startup fallback path', () => {
		expect(buildStartupFallbackPath()).toBe('/spaces/inbox')
		expect(buildStartupFallbackPath({ type: 'space', spaceId: 'space-a' })).toBe(
			'/space/space-a/inbox',
		)
	})
})
