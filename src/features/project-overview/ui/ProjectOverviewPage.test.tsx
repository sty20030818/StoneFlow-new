import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import {
	BulkActionConfirmDialog,
	BulkActionProvider,
	createProjectBulkAdapter,
	projectBulkActions,
	useBulkActionContext,
} from '@/features/bulk-action'
import { ProjectOverviewPage } from '@/features/project-overview/ui/ProjectOverviewPage'
import type { ProjectOverviewItem, Scope } from '@/shared/types'

const loadOverviewSpy = vi.fn<(scope: Scope, viewKey: string) => Promise<void>>()
const loadProjectViewsSpy = vi.fn<() => Promise<void>>()
const archiveProjectSpy = vi.fn<(projectId: string) => Promise<unknown>>()
const deleteProjectSpy = vi.fn<(projectId: string) => Promise<unknown>>()
const refreshLoadedSlicesSpy = vi.fn<() => Promise<void>>()
const toastSuccessSpy = vi.fn<(message: string) => void>()
const toastErrorSpy = vi.fn<(message: string) => void>()

let storeState = createProjectStoreState()

vi.mock('@/app/layouts/main-card/MainCardLayout', () => ({
	MainCard: {
		Root: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		Header: ({ breadcrumb, action }: { breadcrumb: ReactNode; action?: ReactNode }) => (
			<div>
				{breadcrumb}
				{action}
			</div>
		),
		Toolbar: ({ pills }: { pills: Array<{ label: string; onClick: () => void }> }) => (
			<div>
				{pills.map((pill) => (
					<button key={pill.label} onClick={pill.onClick} type='button'>
						{pill.label}
					</button>
				))}
			</div>
		),
		Body: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		Footer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		Empty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		NoticeGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		GhostAction: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
			<button onClick={onClick} type='button'>
				{children}
			</button>
		),
	},
}))

vi.mock('@/app/layouts/shell/model/useDialogStore', () => ({
	useDialogStore: (selector: (state: { openProjectCreateDialog: () => void }) => unknown) =>
		selector({
			openProjectCreateDialog: vi.fn(),
		}),
}))

vi.mock('@/features/project/model/useProjectStore', () => ({
	selectProjectOverview: (state: typeof storeState) => state.overview,
	useProjectStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}))

vi.mock('@/features/space/model/scopeRoute', () => ({
	useScopeRoute: () => ({
		scope: { type: 'all' },
		spaceId: null,
	}),
}))

vi.mock('@/features/space/model/useSpaceStore', () => ({
	selectSpaces: (state: typeof spaceState) => state.spaces,
	useSpaceStore: (selector: (state: typeof spaceState) => unknown) => selector(spaceState),
}))

vi.mock('@/features/view/model/useViewStore', () => ({
	selectProjectViews: (state: typeof viewState) => state.projectViews,
	useViewStore: (selector: (state: typeof viewState) => unknown) => selector(viewState),
}))

vi.mock('@/features/project/api/projects', () => ({
	archiveProject: (projectId: string) => archiveProjectSpy(projectId),
	deleteProject: (projectId: string) => deleteProjectSpy(projectId),
}))

vi.mock('sonner', () => ({
	toast: {
		success: (message: string) => toastSuccessSpy(message),
		error: (message: string) => toastErrorSpy(message),
	},
}))

const spaceState = {
	spaces: [],
}

const viewState = {
	projectViews: {
		items: [],
		status: 'ready' as const,
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
		refreshLoadedSlicesSpy.mockReset()
		refreshLoadedSlicesSpy.mockResolvedValue()
		toastSuccessSpy.mockReset()
		toastErrorSpy.mockReset()
	})

	it('多选后显示归档和删除批量入口', () => {
		renderProjectOverviewPage()

		fireEvent.click(screen.getByRole('checkbox', { name: '选择项目 项目 A' }))
		fireEvent.click(screen.getByRole('checkbox', { name: '选择项目 项目 B' }))

		const bulkToolbar = screen.getByRole('toolbar', { name: '批量操作' })
		expect(within(bulkToolbar).getByText('已选 2 项')).toBeInTheDocument()
		expect(within(bulkToolbar).getByRole('button', { name: '归档' })).toBeInTheDocument()
		expect(within(bulkToolbar).getByRole('button', { name: '删除' })).toBeInTheDocument()
	})

	it('归档批量操作先确认，成功后刷新一次并清空 selection', async () => {
		renderProjectOverviewPage()

		fireEvent.click(screen.getByRole('checkbox', { name: '选择项目 项目 A' }))
		fireEvent.click(screen.getByRole('checkbox', { name: '选择项目 项目 B' }))
		fireEvent.click(within(screen.getByRole('toolbar', { name: '批量操作' })).getByText('归档'))

		expect(screen.getByRole('alertdialog')).toBeInTheDocument()
		expect(screen.getByText('归档选中项目？')).toBeInTheDocument()
		expect(archiveProjectSpy).not.toHaveBeenCalled()

		fireEvent.click(
			within(screen.getByRole('alertdialog')).getByRole('button', { name: '确认归档' }),
		)

		await waitFor(() => {
			expect(archiveProjectSpy).toHaveBeenCalledTimes(2)
		})
		expect(archiveProjectSpy).toHaveBeenNthCalledWith(1, 'project-a')
		expect(archiveProjectSpy).toHaveBeenNthCalledWith(2, 'project-b')
		expect(refreshLoadedSlicesSpy).toHaveBeenCalledTimes(1)
		expect(toastSuccessSpy).toHaveBeenCalledWith('已归档 2 个项目')
		expect(screen.queryByText('已选 2 项')).not.toBeInTheDocument()
	})
})

function renderProjectOverviewPage() {
	return render(
		<MemoryRouter>
			<TestBulkActionBoundary>
				<ProjectOverviewPage />
			</TestBulkActionBoundary>
		</MemoryRouter>,
	)
}

function TestBulkActionBoundary({ children }: { children: ReactNode }) {
	const adapter = createProjectBulkAdapter({
		availableProjectIds: storeState.overview.items.map((project) => project.id),
		archiveProject: archiveProjectSpy as never,
		deleteProject: deleteProjectSpy as never,
		refreshLoadedSlices: refreshLoadedSlicesSpy,
	})

	return (
		<BulkActionProvider actions={projectBulkActions} context={{ adapter }}>
			{children}
			<TestBulkActionConfirmDialog />
		</BulkActionProvider>
	)
}

function TestBulkActionConfirmDialog() {
	const { cancelPendingAction, confirmPendingAction, isExecuting, pendingConfirmation } =
		useBulkActionContext()

	return (
		<BulkActionConfirmDialog
			isExecuting={isExecuting}
			onCancel={cancelPendingAction}
			onConfirm={confirmPendingAction}
			onOpenChange={() => undefined}
			open={Boolean(pendingConfirmation)}
			request={pendingConfirmation}
		/>
	)
}

function createProjectStoreState() {
	return {
		overview: {
			items: [
				createProject({ id: 'project-a', name: '项目 A' }),
				createProject({ id: 'project-b', name: '项目 B' }),
			],
			status: 'ready' as const,
			error: null,
			scope: { type: 'all' } as Scope,
			viewKey: 'all_projects',
		},
		loadOverview: loadOverviewSpy,
		completeProject: vi.fn(),
		reopenProject: vi.fn(),
		archiveProject: vi.fn(),
		deleteProject: vi.fn(),
		refreshLoadedSlices: refreshLoadedSlicesSpy,
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
		dueAt: overrides.dueAt ?? null,
		sortOrder: overrides.sortOrder ?? 1000,
		taskCount: overrides.taskCount ?? 3,
		activeTaskCount: overrides.activeTaskCount ?? 2,
		completedAt: overrides.completedAt ?? null,
		archivedAt: overrides.archivedAt ?? null,
		deletedAt: overrides.deletedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-05-01T00:00:00Z',
		updatedAt: overrides.updatedAt ?? '2026-05-01T00:00:00Z',
	}
}
