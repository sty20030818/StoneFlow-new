import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ArchiveIcon, Trash2Icon, type LucideIcon } from 'lucide-react'
import { MemoryRouter } from 'react-router-dom'

import { LifecycleList } from '@/features/lifecycle/ui/LifecycleList'
import type { LifecycleEntry, Scope } from '@/shared/types'

const loadArchiveSpy = vi.fn<(scope: Scope) => Promise<void>>()
const loadTrashSpy = vi.fn<(scope: Scope) => Promise<void>>()
const restoreEntrySpy = vi.fn<(entry: LifecycleEntry) => Promise<void>>()
const restoreLifecycleEntrySpy = vi.fn<(entry: LifecycleEntry) => Promise<unknown>>()
const permanentlyDeleteLifecycleEntrySpy = vi.fn<(entry: LifecycleEntry) => Promise<unknown>>()
const refreshLoadedSlicesSpy = vi.fn<() => Promise<void>>()
const openDrawerSpy = vi.fn<(kind: string, id: string) => void>()
const toastSuccessSpy = vi.fn<(message: string) => void>()
const toastErrorSpy = vi.fn<(message: string) => void>()

let mockScope: Scope = { type: 'all' }
let storeState = createStoreState()

vi.mock('@/app/layouts/main-card/MainCardLayout', () => ({
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
		Footer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		Empty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		NoticeGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		GhostAction: ({ children }: { children: ReactNode }) => (
			<button type='button'>{children}</button>
		),
	},
}))

vi.mock('@/app/layouts/shell/model/useDrawerStore', () => ({
	useDrawerStore: (selector: (state: { openDrawer: typeof openDrawerSpy }) => unknown) =>
		selector({
			openDrawer: openDrawerSpy,
		}),
}))

vi.mock('@/features/lifecycle/model/useLifecycleStore', () => ({
	selectArchiveEntries: (state: typeof storeState) => state.archiveEntries,
	selectTrashEntries: (state: typeof storeState) => state.trashEntries,
	useLifecycleStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}))

vi.mock('@/features/lifecycle/api/lifecycle', () => ({
	restoreLifecycleEntry: (entry: LifecycleEntry) => restoreLifecycleEntrySpy(entry),
	permanentlyDeleteLifecycleEntry: (entry: LifecycleEntry) =>
		permanentlyDeleteLifecycleEntrySpy(entry),
}))

vi.mock('@/features/space/model/scopeRoute', () => ({
	useScopeRoute: () => ({
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
		restoreLifecycleEntrySpy.mockReset()
		restoreLifecycleEntrySpy.mockResolvedValue({})
		permanentlyDeleteLifecycleEntrySpy.mockReset()
		permanentlyDeleteLifecycleEntrySpy.mockResolvedValue({})
		refreshLoadedSlicesSpy.mockReset()
		refreshLoadedSlicesSpy.mockResolvedValue()
		openDrawerSpy.mockReset()
		toastSuccessSpy.mockReset()
		toastErrorSpy.mockReset()
	})

	it('Archive 模式渲染三分区与对应操作按钮', async () => {
		renderLifecycleList({
			mode: 'archive',
			title: '归档',
			icon: ArchiveIcon,
		})

		await waitFor(() => {
			expect(loadArchiveSpy).toHaveBeenCalledWith({ type: 'all' })
		})

		expect(screen.getByText('已归档的空间')).toBeInTheDocument()
		expect(screen.getByText('已归档的项目')).toBeInTheDocument()
		expect(screen.getByText('已归档的任务')).toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: '恢复' })).toHaveLength(3)
		expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '打开' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '永久删除' })).not.toBeInTheDocument()
	})

	it('Archive 模式多选后通过批量条恢复并清空 selection', async () => {
		renderLifecycleList({
			mode: 'archive',
			title: '归档',
			icon: ArchiveIcon,
		})

		fireEvent.click(screen.getByRole('checkbox', { name: '选择 工作' }))
		fireEvent.click(screen.getByRole('checkbox', { name: '选择 补齐生命周期页面' }))

		expect(screen.getByText('已选 2 项')).toBeInTheDocument()
		const bulkToolbar = screen.getByRole('toolbar', { name: '批量操作' })
		fireEvent.click(within(bulkToolbar).getByRole('button', { name: '恢复' }))

		await waitFor(() => {
			expect(restoreLifecycleEntrySpy).toHaveBeenCalledTimes(2)
		})
		expect(restoreLifecycleEntrySpy).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ id: 'space-1' }),
		)
		expect(restoreLifecycleEntrySpy).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ id: 'task-1' }),
		)
		expect(refreshLoadedSlicesSpy).toHaveBeenCalledTimes(1)
		expect(toastSuccessSpy).toHaveBeenCalledWith('已恢复 2 个条目')
		expect(screen.queryByText('已选 2 项')).not.toBeInTheDocument()
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

		renderLifecycleList({
			mode: 'trash',
			title: '回收站',
			icon: Trash2Icon,
		})

		await waitFor(() => {
			expect(loadTrashSpy).toHaveBeenCalledWith({ type: 'all' })
		})

		expect(screen.getByText('回收站为空')).toBeInTheDocument()
		expect(
			screen.getByText('删除后的内容会统一出现在这里，等待恢复或永久删除。'),
		).toBeInTheDocument()
	})

	it('Trash 模式多选后展示恢复与永久删除入口', () => {
		renderLifecycleList({
			mode: 'trash',
			title: '回收站',
			icon: Trash2Icon,
		})

		fireEvent.click(screen.getByRole('checkbox', { name: '选择 待永久删除任务' }))

		expect(screen.getByRole('toolbar', { name: '批量操作' })).toBeInTheDocument()
		expect(screen.getAllByRole('button', { name: '恢复' })).toHaveLength(2)
		expect(screen.getByRole('button', { name: '永久删除' })).toBeInTheDocument()
	})

	it('Trash 模式永久删除先确认再执行', async () => {
		renderLifecycleList({
			mode: 'trash',
			title: '回收站',
			icon: Trash2Icon,
		})

		fireEvent.click(screen.getByRole('checkbox', { name: '选择 待永久删除任务' }))
		fireEvent.click(screen.getByRole('button', { name: '永久删除' }))

		expect(screen.getByRole('alertdialog')).toBeInTheDocument()
		expect(screen.getByText('永久删除选中条目？')).toBeInTheDocument()
		expect(permanentlyDeleteLifecycleEntrySpy).not.toHaveBeenCalled()

		fireEvent.click(
			within(screen.getByRole('alertdialog')).getByRole('button', { name: '永久删除' }),
		)

		await waitFor(() => {
			expect(permanentlyDeleteLifecycleEntrySpy).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'task-2' }),
			)
		})
		expect(refreshLoadedSlicesSpy).toHaveBeenCalledTimes(1)
		expect(toastSuccessSpy).toHaveBeenCalledWith('已永久删除 1 个条目')
		expect(screen.queryByText('已选 1 项')).not.toBeInTheDocument()
	})
})

function renderLifecycleList(props: {
	mode: 'archive' | 'trash'
	title: string
	icon: LucideIcon
}) {
	return render(
		<MemoryRouter>
			<LifecycleList {...props} />
		</MemoryRouter>,
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
			status: 'ready' as const,
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
			status: 'ready' as const,
			error: null,
			scope: { type: 'all' } as Scope,
			entityFilter: undefined,
		},
		pendingEntryId: null,
		loadArchive: loadArchiveSpy,
		loadTrash: loadTrashSpy,
		restoreEntry: restoreEntrySpy,
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
