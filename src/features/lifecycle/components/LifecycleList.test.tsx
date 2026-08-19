import type { ReactNode } from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import { BulkActionProvider } from '@/features/bulk-action'
import { KeybindingRegistry, ShortcutRegistryProvider } from '@/features/command'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import { createLifecycleBulkAdapter, lifecycleBulkActions } from '@/features/lifecycle'
import { LifecycleList } from '@/features/lifecycle/components/LifecycleList'
import type { LifecycleEntry, Scope } from '@/shared/types'
import { renderWithRouterContext } from '@/test/renderWithRouter'

const loadArchiveSpy = vi.fn<(scope: Scope) => Promise<void>>()
const loadTrashSpy = vi.fn<(scope: Scope) => Promise<void>>()
const restoreEntrySpy = vi.fn<(entry: LifecycleEntry) => Promise<void>>()
const deleteEntrySpy = vi.fn<(entry: LifecycleEntry) => Promise<void>>()
const permanentlyDeleteEntrySpy = vi.fn<(entry: LifecycleEntry) => Promise<void>>()
const restoreLifecycleEntrySpy = vi.fn<(entry: LifecycleEntry) => Promise<unknown>>()
const permanentlyDeleteLifecycleEntrySpy = vi.fn<(entry: LifecycleEntry) => Promise<unknown>>()
const refreshLoadedSlicesSpy = vi.fn<() => Promise<void>>()
const openTaskDetailSpy = vi.fn<(taskId: string) => void>()
const toastSuccessSpy = vi.fn<(message: string) => void>()
const toastErrorSpy = vi.fn<(message: string) => void>()

let mockScope: Scope = { type: 'all' }
let storeState = createStoreState()
type MockQueryStatus = 'loading' | 'ready' | 'error'
const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry([])

vi.mock('@/shared/components/main-card/MainCardLayout', () => ({
	MainCard: {
		Root: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		Header: ({ breadcrumb }: { breadcrumb: ReactNode }) => <div>{breadcrumb}</div>,
		Toolbar: ({ pills }: { pills: Array<{ label: string }> }) => (
			<div>
				{pills.map((pill) => (
					<span key={pill.label}>{pill.label}</span>
				))}
			</div>
		),
		Body: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		Empty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		NoticeGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		GhostAction: ({ children }: { children: ReactNode }) => (
			<button type='button'>{children}</button>
		),
	},
}))

vi.mock('@/features/entity-detail', () => ({
	useEntityDetailController: () => ({
		activeDetail: null,
		isOpen: false,
		openTaskDetail: openTaskDetailSpy,
		closeDrawer: vi.fn(),
		openPage: vi.fn(),
	}),
}))

vi.mock('@/features/lifecycle/hooks/lifecycle.queries', () => ({
	useLifecycleEntriesQuery: (mode: 'archive' | 'trash') => {
		const slice = mode === 'archive' ? storeState.archiveEntries : storeState.trashEntries
		return {
			data: slice.items,
			isError: slice.status === 'error',
			isLoading: slice.status === 'loading',
			isPending: slice.status === 'loading',
			error: slice.error,
			refetch: mode === 'archive' ? loadArchiveSpy : loadTrashSpy,
		}
	},
}))

vi.mock('@/features/lifecycle/hooks/lifecycle.mutations', () => ({
	useRestoreLifecycleEntryMutation: () => ({
		mutateAsync: restoreEntrySpy,
	}),
	useDeleteLifecycleEntryMutation: () => ({
		mutateAsync: deleteEntrySpy,
	}),
	usePermanentlyDeleteLifecycleEntryMutation: () => ({
		mutateAsync: permanentlyDeleteEntrySpy,
	}),
}))

vi.mock('@/features/lifecycle/api/lifecycle', () => ({
	deleteLifecycleEntry: vi.fn<(entry: LifecycleEntry) => Promise<unknown>>(),
	restoreLifecycleEntry: (entry: LifecycleEntry) => restoreLifecycleEntrySpy(entry),
	permanentlyDeleteLifecycleEntry: (entry: LifecycleEntry) =>
		permanentlyDeleteLifecycleEntrySpy(entry),
}))

vi.mock('@/app/navigation/ShellRouteContext', () => ({
	useCurrentShellRoute: () => ({
		scope: mockScope,
		spaceId: mockScope.type === 'space' ? mockScope.spaceId : null,
	}),
}))

vi.mock('@/shared/events', () => ({
	emitEvent: vi.fn(),
}))

vi.mock('sonner', () => ({
	toast: {
		success: (message: string) => toastSuccessSpy(message),
		error: (message: string) => toastErrorSpy(message),
	},
}))

describe('LifecycleList', () => {
	beforeEach(() => {
		mockScope = { type: 'all' }
		storeState = createStoreState()
		loadArchiveSpy.mockReset()
		loadTrashSpy.mockReset()
		restoreEntrySpy.mockReset()
		deleteEntrySpy.mockReset()
		deleteEntrySpy.mockResolvedValue()
		permanentlyDeleteEntrySpy.mockReset()
		permanentlyDeleteEntrySpy.mockResolvedValue()
		restoreLifecycleEntrySpy.mockReset()
		restoreLifecycleEntrySpy.mockResolvedValue({})
		permanentlyDeleteLifecycleEntrySpy.mockReset()
		permanentlyDeleteLifecycleEntrySpy.mockResolvedValue({})
		refreshLoadedSlicesSpy.mockReset()
		refreshLoadedSlicesSpy.mockResolvedValue()
		openTaskDetailSpy.mockReset()
		toastSuccessSpy.mockReset()
		toastErrorSpy.mockReset()
	})

	it('Archive 模式渲染三分区与对应操作按钮', async () => {
		await renderLifecycleList({ mode: 'archive' })

		expect(screen.getByText('已归档的空间')).toBeInTheDocument()
		expect(screen.getByText('已归档的项目')).toBeInTheDocument()
		expect(screen.getByText('已归档的任务')).toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: '恢复' })).toHaveLength(3)
		expect(screen.queryByRole('button', { name: '打开' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '永久删除' })).not.toBeInTheDocument()
	})

	it('Trash 模式在空列表时展示页面空状态', async () => {
		storeState = createStoreState({
			trashEntries: {
				items: [],
				status: 'ready',
				error: null,
				scope: { type: 'all' },
				entityFilter: undefined,
			},
		})

		await renderLifecycleList({ mode: 'trash' })

		expect(screen.getByText('当前没有已删除内容')).toBeInTheDocument()
		expect(
			screen.getByText(
				'删除后的任务和项目会先来到这里。点「返回独立事项」先回去继续处理内容就好。',
			),
		).toBeInTheDocument()
	})

	it('archive 单条 task 右键可移入回收站，trash 单条 task 右键可永久删除', async () => {
		await renderLifecycleList({ mode: 'archive' })

		fireEvent.contextMenu(screen.getByRole('button', { name: '打开 补齐生命周期页面' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '移入回收站' }))
		fireEvent.click(await screen.findByRole('button', { name: '移入回收站' }))

		await waitFor(() => {
			expect(deleteEntrySpy).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'task-1', entityType: 'task' }),
			)
		})

		await renderLifecycleList({ mode: 'trash' })

		fireEvent.contextMenu(screen.getByText('待永久删除任务'))
		fireEvent.click(await screen.findByRole('menuitem', { name: '永久删除' }))
		fireEvent.click(await screen.findByRole('button', { name: '永久删除' }))

		await waitFor(() => {
			expect(permanentlyDeleteEntrySpy).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'task-2', entityType: 'task' }),
			)
		})
	})

	it('归档条目删除失败时显示错误，不产生未处理 Promise', async () => {
		deleteEntrySpy.mockRejectedValueOnce({ message: '当前条目不可删除' })
		await renderLifecycleList({ mode: 'archive' })

		fireEvent.contextMenu(screen.getByRole('button', { name: '打开 补齐生命周期页面' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '移入回收站' }))
		fireEvent.click(await screen.findByRole('button', { name: '移入回收站' }))

		await waitFor(() => {
			expect(toastErrorSpy).toHaveBeenCalledWith('当前条目不可删除')
		})
	})
})

async function renderLifecycleList(props: { mode: 'archive' | 'trash' }) {
	return renderWithRouterContext(
		<TestBulkActionBoundary mode={props.mode}>
			<LifecycleList {...props} />
		</TestBulkActionBoundary>,
	)
}

function TestBulkActionBoundary({
	children,
	mode,
}: {
	children: ReactNode
	mode: 'archive' | 'trash'
}) {
	const archiveEntries = storeState.archiveEntries
	const trashEntries = storeState.trashEntries
	const slice = mode === 'archive' ? archiveEntries : trashEntries
	const adapter = createLifecycleBulkAdapter({
		entries: slice.items,
		refreshLoadedSlices: refreshLoadedSlicesSpy,
	})

	return (
		<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>
			<DangerConfirmProvider>
				<BulkActionProvider actions={lifecycleBulkActions} context={{ adapter }}>
					{children}
				</BulkActionProvider>
			</DangerConfirmProvider>
		</ShortcutRegistryProvider>
	)
}

function createStoreState(overrides?: Partial<ReturnType<typeof createStoreStateBase>>) {
	return {
		...createStoreStateBase(),
		...overrides,
	}
}

function createStoreStateBase() {
	return {
		archiveEntries: {
			items: [
				createEntry({ id: 'space-1', entityType: 'space', title: '工作', projectName: null }),
				createEntry({
					id: 'project-1',
					entityType: 'project',
					title: '阶段 10',
					projectId: 'project-1',
					projectName: '阶段 10',
				}),
				createEntry({
					id: 'task-1',
					entityType: 'task',
					title: '补齐生命周期页面',
					projectId: 'project-1',
					projectName: '阶段 10',
				}),
			],
			status: 'ready' as MockQueryStatus,
			error: null,
			scope: { type: 'all' } as Scope,
			entityFilter: undefined,
		},
		trashEntries: {
			items: [
				createEntry({
					id: 'task-2',
					entityType: 'task',
					title: '待永久删除任务',
					deletedAt: '2026-05-03T10:00:00Z',
					archivedAt: null,
				}),
			],
			status: 'ready' as MockQueryStatus,
			error: null,
			scope: { type: 'all' } as Scope,
			entityFilter: undefined,
		},
		pendingEntryId: null,
		loadArchive: loadArchiveSpy,
		loadTrash: loadTrashSpy,
		restoreEntry: restoreEntrySpy,
		deleteEntry: deleteEntrySpy,
		permanentlyDeleteEntry: permanentlyDeleteEntrySpy,
		refreshLoadedSlices: refreshLoadedSlicesSpy,
	}
}

function createEntry(
	overrides: Partial<LifecycleEntry> & Pick<LifecycleEntry, 'id' | 'entityType' | 'title'>,
): LifecycleEntry {
	return {
		id: overrides.id,
		entityType: overrides.entityType,
		title: overrides.title,
		spaceId: overrides.spaceId ?? 'space-1',
		spaceName: overrides.spaceName ?? '工作',
		projectId: overrides.projectId ?? null,
		projectName: overrides.projectName ?? null,
		archivedAt: overrides.archivedAt ?? '2026-05-03T10:00:00Z',
		deletedAt: overrides.deletedAt ?? null,
		sourceType: overrides.sourceType ?? 'self',
		sourceId: overrides.sourceId ?? overrides.id,
		restoreHint: overrides.restoreHint ?? '恢复提示',
	}
}
