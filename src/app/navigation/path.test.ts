import {
	buildCanonicalProjectPath,
	buildCanonicalSectionPath,
	buildProjectPath,
	buildScopedSettingsPath,
	buildSettingsPath,
	buildStartupFallbackPath,
	buildTaskDetailPath,
} from './path'

describe('path build (S1)', () => {
	it('构建 all / space section path', () => {
		expect(buildCanonicalSectionPath({ type: 'all' }, 'standalone')).toBe('/all/standalone')
		expect(buildCanonicalSectionPath({ type: 'space', spaceId: 'space-a' }, 'tasks')).toBe(
			'/space-a/tasks',
		)
	})

	it('构建详情 path', () => {
		expect(buildTaskDetailPath('space/a', 'task/a')).toBe('/space%2Fa/tasks/task%2Fa')
		expect(buildProjectPath('space-a', 'project/a')).toBe('/space-a/projects/project%2Fa')
		expect(buildCanonicalProjectPath({ type: 'space', spaceId: 'space-a' }, 'project-a')).toBe(
			'/space-a/projects/project-a',
		)
	})

	it('settings 与 startup', () => {
		expect(buildScopedSettingsPath({ type: 'all' }, null, 'sync')).toBe('/all/settings/sync')
		expect(buildSettingsPath()).toBe('/all/settings/general')
		expect(buildStartupFallbackPath()).toBe('/all/tasks')
		expect(buildStartupFallbackPath({ type: 'space', spaceId: 'space-a' })).toBe(
			'/space-a/standalone',
		)
	})
})
