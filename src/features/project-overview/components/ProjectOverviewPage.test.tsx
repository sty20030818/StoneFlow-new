import type { ReactNode } from 'react'
import { screen } from '@testing-library/react'

import { ProjectOverviewPage } from '@/features/project-overview/components/ProjectOverviewPage'
import type { ProjectOverviewItem, Scope } from '@/shared/types'
import { renderWithRouterContext } from '@/test/renderWithRouter'

const loadOverviewSpy = vi.fn<(scope: Scope, viewKey: string) => Promise<void>>()
const loadProjectViewsSpy = vi.fn<() => Promise<void>>()
const archiveProjectSpy = vi.fn<(projectId: string) => Promise<unknown>>()
const deleteProjectSpy = vi.fn<(projectId: string) => Promise<unknown>>()

const baseOverviewState = {
	items: [
		createProject({ id: 'project-a', name: '项目 A' }),
		createProject({ id: 'project-b', name: '项目 B' }),
	],
	status: 'ready' as 'loading' | 'ready' | 'error',
	error: null,
	scope: { type: 'all' } as Scope,
	viewKey: 'all_projects' as const,
}

let storeState = createProjectStoreState()

vi.mock('@/shared/components/main-card/MainCardLayout', () => ({
	MainCard: {
		Root: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		Header: ({ breadcrumb, action }: { breadcrumb: ReactNode; action?: ReactNode }) => (
			<div>
				{breadcrumb}
				{action}
			</div>
		),
		Toolbar: ({ pills }: { pills: Array<{ label: string; onPress: () => void }> }) => (
			<div>
				{pills.map((pill) => (
					<button key={pill.label} onClick={pill.onPress} type='button'>
						{pill.label}
					</button>
				))}
			</div>
		),
		Body: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		Empty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		NoticeGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		GhostAction: ({ children, onPress }: { children: ReactNode; onPress?: () => void }) => (
			<button onClick={onPress} type='button'>
				{children}
			</button>
		),
	},
}))

vi.mock('@/features/shell-dialogs', () => ({
	useDialogStore: (selector: (state: { openProjectCreateDialog: () => void }) => unknown) =>
		selector({
			openProjectCreateDialog: vi.fn(),
		}),
}))

vi.mock('@/features/project', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/project')>()
	return {
		...actual,
		useProjectOverviewData: () => ({
			items: storeState.overview.items,
			status: storeState.overview.status,
			error: storeState.overview.error ?? null,
			refetch: loadOverviewSpy,
		}),
		useCompleteProjectMutation: () => ({
			mutateAsync: vi.fn(),
		}),
		useReopenProjectMutation: () => ({
			mutateAsync: vi.fn(),
		}),
		useArchiveProjectMutation: () => ({
			mutateAsync: archiveProjectSpy,
		}),
		useDeleteProjectMutation: () => ({
			mutateAsync: deleteProjectSpy,
		}),
		archiveProject: (projectId: string) => archiveProjectSpy(projectId),
		deleteProject: (projectId: string) => deleteProjectSpy(projectId),
	}
})

vi.mock('@/app/navigation/ShellRouteContext', () => ({
	useCurrentShellRoute: () => ({
		appRoute: {
			kind: 'shell-section',
			scope: { type: 'all' },
			section: 'projects',
			pathname: '/all/projects',
			search: '',
			hash: '',
			fullPath: '/all/projects',
		},
		kind: 'shell-section',
		scope: { type: 'all' },
		spaceId: null,
		section: 'projects',
		settingsSection: null,
		viewId: null,
		projectId: null,
		taskId: null,
		pathname: '/all/projects',
		search: '',
		hash: '',
		fullPath: '/all/projects',
		isShellPath: true,
		isSettingsPath: false,
		isDebugPath: false,
		isWorkPath: true,
	}),
}))

vi.mock('@/features/view', () => ({
	useViewsQuery: () => ({
		data: viewState.projectViews.items,
		isError: viewState.projectViews.status === 'error',
		isLoading: viewState.projectViews.status === 'loading',
		isPending: viewState.projectViews.status === 'loading',
		error: viewState.projectViews.error,
		refetch: loadProjectViewsSpy,
	}),
}))

const viewState = {
	projectViews: {
		items: [],
		status: 'ready' as 'loading' | 'ready' | 'error',
		error: null,
	},
	loadProjectViews: loadProjectViewsSpy,
}

describe('ProjectOverviewPage', () => {
	beforeEach(() => {
		storeState = createProjectStoreState()
		loadOverviewSpy.mockReset()
		loadProjectViewsSpy.mockReset()
		archiveProjectSpy.mockReset()
		archiveProjectSpy.mockResolvedValue({})
		deleteProjectSpy.mockReset()
		deleteProjectSpy.mockResolvedValue({})
	})

	it('空状态文案使用统一的项目总览文案', async () => {
		storeState = createProjectStoreState({
			overview: {
				items: [],
				status: 'ready',
			},
		})

		await renderProjectOverviewPage()

		expect(screen.getByText('当前没有项目')).toBeInTheDocument()
		expect(
			screen.getByText(
				'这里还没有项目，可以先从一个项目开始。点「创建项目」先建起来，后面的任务和节奏就有地方承接了。',
			),
		).toBeInTheDocument()
	})
})

async function renderProjectOverviewPage() {
	return renderWithRouterContext(<ProjectOverviewPage />)
}

function createProjectStoreState(
	overrides?: Partial<{
		overview: Partial<typeof baseOverviewState>
	}>,
) {
	const overview = {
		...baseOverviewState,
		...overrides?.overview,
	}

	return {
		overview,
		loadOverview: loadOverviewSpy,
		completeProject: vi.fn(),
		reopenProject: vi.fn(),
		archiveProject: vi.fn(),
		deleteProject: vi.fn(),
	}
}

function createProject(
	overrides: Partial<ProjectOverviewItem> & Pick<ProjectOverviewItem, 'id' | 'name'>,
): ProjectOverviewItem {
	return {
		id: overrides.id,
		spaceId: overrides.spaceId ?? 'space-1',
		spaceName: overrides.spaceName ?? '个人',
		name: overrides.name,
		description: overrides.description ?? null,
		status: overrides.status ?? 'todo',
		priority: overrides.priority ?? 0,
		plannedAt: overrides.plannedAt ?? null,
		dueAt: overrides.dueAt ?? null,
		remindAt: overrides.remindAt ?? null,
		statusChangedAt: overrides.statusChangedAt ?? '2026-05-01T00:00:00Z',
		position: overrides.position ?? 1000,
		taskCount: overrides.taskCount ?? 3,
		activeTaskCount: overrides.activeTaskCount ?? 2,
		completedAt: overrides.completedAt ?? null,
		archivedAt: overrides.archivedAt ?? null,
		deletedAt: overrides.deletedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-05-01T00:00:00Z',
		updatedAt: overrides.updatedAt ?? '2026-05-01T00:00:00Z',
	}
}
