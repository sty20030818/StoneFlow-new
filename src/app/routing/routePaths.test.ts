import {
	buildCanonicalProjectPath,
	buildCanonicalSectionPath,
	buildProjectDetailPath,
	buildStartupFallbackPath,
	buildTaskDetailPath,
} from './routePaths'

describe('routePaths', () => {
	it('构建 canonical all scope section path', () => {
		expect(buildCanonicalSectionPath({ type: 'all' }, 'inbox')).toBe('/all/inbox')
		expect(buildCanonicalSectionPath({ type: 'all' }, 'projects')).toBe('/all/projects')
	})

	it('构建 canonical space scope section path 与 fallback space', () => {
		expect(buildCanonicalSectionPath({ type: 'space', spaceId: 'space-a' }, 'all-tasks')).toBe(
			'/spaces/space-a/all-tasks',
		)
		expect(
			buildCanonicalSectionPath({ type: 'space', spaceId: '' as never }, 'views', 'space-fallback'),
		).toBe('/spaces/space-fallback/views')
	})

	it('构建 canonical shell project path', () => {
		expect(buildCanonicalProjectPath({ type: 'space', spaceId: 'space-a' }, 'project-a')).toBe(
			'/spaces/space-a/project/project-a',
		)
		expect(buildCanonicalProjectPath({ type: 'all' }, undefined, 'space-a')).toBe('/all/projects')
	})

	it('构建 canonical entity detail path', () => {
		expect(buildTaskDetailPath('space/a', 'task/a')).toBe('/spaces/space%2Fa/tasks/task%2Fa')
		expect(buildProjectDetailPath('space-a', 'project/a')).toBe(
			'/spaces/space-a/projects/project%2Fa/detail',
		)
	})

	it('构建 startup fallback path', () => {
		expect(buildStartupFallbackPath()).toBe('/all/inbox')
		expect(buildStartupFallbackPath({ type: 'space', spaceId: 'space-a' })).toBe(
			'/spaces/space-a/inbox',
		)
	})
})
