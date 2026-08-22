import { resolveSavedViewWorkspaceContext } from './useViewsScene'

describe('resolveSavedViewWorkspaceContext', () => {
	it('从 Saved View context 派生创建落点与列表能力', () => {
		expect(resolveSavedViewWorkspaceContext({ kind: 'all' }, { type: 'all' })).toEqual({
			createDraft: { status: 'todo' },
			createProjectId: null,
			supportsProject: true,
			showSpaceLabel: true,
		})
		expect(resolveSavedViewWorkspaceContext({ kind: 'standalone' }, { type: 'all' })).toEqual({
			createDraft: { placement: 'standalone' },
			createProjectId: null,
			supportsProject: false,
			showSpaceLabel: true,
		})
		expect(
			resolveSavedViewWorkspaceContext(
				{ kind: 'project', projectId: 'project-a' },
				{ type: 'space', spaceId: 'space-a' },
			),
		).toEqual({
			createDraft: { projectId: 'project-a' },
			createProjectId: 'project-a',
			supportsProject: false,
			showSpaceLabel: false,
		})
	})
})
