import { buildProjectShortcutPath, buildScopedProjectPath, buildScopedSectionPath, buildStartupFallbackPath, buildTaskShortcutPath } from './routePaths'
import { buildLegacyProjectPath, buildLegacySectionPath } from './routePaths'

describe('routePaths', () => {
	it('构建 canonical all scope section path', () => {
		expect(buildScopedSectionPath({ type: 'all' }, 'inbox')).toBe('/all/inbox')
		expect(buildScopedSectionPath({ type: 'all' }, 'projects')).toBe('/all/projects')
	})

	it('构建 canonical space scope section path 与 fallback space', () => {
		expect(buildScopedSectionPath({ type: 'space', spaceId: 'space-a' }, 'all-tasks')).toBe(
			'/spaces/space-a/all-tasks',
		)
		expect(buildScopedSectionPath({ type: 'space', spaceId: '' as never }, 'views', 'space-fallback')).toBe(
			'/spaces/space-fallback/views',
		)
	})

	it('构建 canonical scoped project path', () => {
		expect(buildScopedProjectPath({ type: 'space', spaceId: 'space-a' }, 'project-a')).toBe(
			'/spaces/space-a/project/project-a',
		)
		expect(buildScopedProjectPath({ type: 'all' }, undefined, 'space-a')).toBe('/all/projects')
	})

	it('保留 legacy builder 生成旧路径', () => {
		expect(buildLegacySectionPath({ type: 'all' }, 'inbox')).toBe('/spaces/inbox')
		expect(buildLegacySectionPath({ type: 'space', spaceId: 'space-a' }, 'views')).toBe(
			'/space/space-a/views',
		)
		expect(buildLegacyProjectPath({ type: 'space', spaceId: 'space-a' }, 'project-a')).toBe(
			'/space/space-a/project/project-a',
		)
	})

	it('构建 entity shortcut path', () => {
		expect(buildTaskShortcutPath('task/a')).toBe('/tasks/task%2Fa')
		expect(buildProjectShortcutPath('project-a')).toBe('/projects/project-a')
	})

	it('构建 startup fallback path', () => {
		expect(buildStartupFallbackPath()).toBe('/all/inbox')
		expect(buildStartupFallbackPath({ type: 'space', spaceId: 'space-a' })).toBe(
			'/spaces/space-a/inbox',
		)
	})
})
