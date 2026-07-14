import {
	buildCanonicalProjectPath,
	buildCanonicalSectionPath,
	buildProjectPath,
	buildScopedSettingsPath,
	buildSettingsPath,
	buildStartupFallbackPath,
	buildTaskDetailPath,
} from './routePaths'

describe('routePaths', () => {
	it('构建 canonical all scope section path', () => {
		expect(buildCanonicalSectionPath({ type: 'all' }, 'inbox')).toBe('/all/inbox')
		expect(buildCanonicalSectionPath({ type: 'all' }, 'projects')).toBe('/all/projects')
	})

	it('构建 canonical space scope section path 与 fallback space', () => {
		expect(buildCanonicalSectionPath({ type: 'space', spaceId: 'space-a' }, 'tasks')).toBe(
			'/spaces/space-a/tasks',
		)
		expect(
			buildCanonicalSectionPath({ type: 'space', spaceId: '' as never }, 'views', 'space-fallback'),
		).toBe('/spaces/space-fallback/views')
	})

	it('构建 canonical shell project path', () => {
		expect(buildCanonicalProjectPath({ type: 'space', spaceId: 'space-a' }, 'project-a')).toBe(
			'/spaces/space-a/projects/project-a',
		)
		expect(buildCanonicalProjectPath({ type: 'all' }, undefined, 'space-a')).toBe('/all/projects')
	})

	it('构建 canonical entity detail path', () => {
		expect(buildTaskDetailPath('space/a', 'task/a')).toBe('/spaces/space%2Fa/tasks/task%2Fa')
		expect(buildProjectPath('space-a', 'project/a')).toBe('/spaces/space-a/projects/project%2Fa')
	})

	it('构建 startup fallback path', () => {
		expect(buildStartupFallbackPath()).toBe('/all/tasks')
		expect(buildStartupFallbackPath({ type: 'space', spaceId: 'space-a' })).toBe(
			'/spaces/space-a/inbox',
		)
	})

	it('构建 settings 路径：bare 与带分区', () => {
		expect(buildScopedSettingsPath({ type: 'all' })).toBe('/all/settings')
		expect(buildScopedSettingsPath({ type: 'all' }, null, 'sync')).toBe('/all/settings/sync')
		expect(buildScopedSettingsPath({ type: 'space', spaceId: 'space-a' }, null, 'general')).toBe(
			'/spaces/space-a/settings/general',
		)
		expect(
			buildScopedSettingsPath({ type: 'space', spaceId: '' as never }, 'space-b', 'update'),
		).toBe('/spaces/space-b/settings/update')
		expect(buildSettingsPath()).toBe('/all/settings/general')
		expect(buildSettingsPath('sidebar')).toBe('/all/settings/sidebar')
	})
})
