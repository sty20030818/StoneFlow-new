import { normalizeLegacyRoute } from './routeMigration'

describe('routeMigration', () => {
	it('迁移 legacy all shell path 到 canonical', () => {
		expect(normalizeLegacyRoute('/spaces/inbox')).toBe('/all/inbox')
		expect(normalizeLegacyRoute('/spaces/views?view=today')).toBe('/all/views?view=today')
	})

	it('迁移 legacy scoped shell path 到 canonical', () => {
		expect(normalizeLegacyRoute('/space/abc/inbox')).toBe('/spaces/abc/inbox')
		expect(normalizeLegacyRoute('/space/abc/views?view=today')).toBe('/spaces/abc/views?view=today')
		expect(normalizeLegacyRoute('/space/abc/project/project-1')).toBe(
			'/spaces/abc/project/project-1',
		)
	})

	it('迁移 focus alias 到 canonical views query', () => {
		expect(normalizeLegacyRoute('/spaces/focus')).toBe('/all/views?view=focus')
		expect(normalizeLegacyRoute('/space/abc/focus')).toBe('/spaces/abc/views?view=focus')
	})

	it('保留未知 query，非 legacy shell path 不改', () => {
		expect(normalizeLegacyRoute('/space/abc/inbox?foo=bar&task=task-1')).toBe(
			'/spaces/abc/inbox?foo=bar&task=task-1',
		)
		expect(normalizeLegacyRoute('/projects/project-a')).toBe('/projects/project-a')
	})
})
