import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ArchiveIcon, Trash2Icon, type LucideIcon } from 'lucide-react'
import { MemoryRouter } from 'react-router-dom'

import { LifecycleList } from '@/features/lifecycle/ui/LifecycleList'
import type { LifecycleEntry, Scope } from '@/shared/types'

const loadArchiveSpy = vi.fn<(scope: Scope) => Promise<void>>()
const loadTrashSpy = vi.fn<(scope: Scope) => Promise<void>>()
const restoreEntrySpy = vi.fn<(entry: LifecycleEntry) => Promise<void>>()
const permanentlyDeleteEntrySpy = vi.fn<(entry: LifecycleEntry) => Promise<void>>()
const refreshLoadedSlicesSpy = vi.fn<() => Promise<void>>()
const openDrawerSpy = vi.fn<(kind: string, id: string) => void>()

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
		GhostAction: ({ children }: { children: ReactNode }) => <button type='button'>{children}</button>,
	},
}))

vi.mock('@/app/layouts/shell/model/useDrawerStore', () => ({
	useDrawerStore: (selector: (state: { openDrawer: typeof openDrawerSpy }) => unknown) =>
		selector({
			openDrawer: openDrawerSpy,
		}),
}))

vi.mock('@/features/lifecycle/api/lifecycle', () => ({
	deleteLifecycleEntry: vi.fn<(entry: LifecycleEntry) => Promise<void>>(),
}))

vi.mock('@/features/lifecycle/model/useLifecycleStore', () => ({
	selectArchiveEntries: (state: typeof storeState) => state.archiveEntries,
	selectTrashEntries: (state: typeof storeState) => state.trashEntries,
	useLifecycleStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
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

describe('LifecycleList', () => {
	beforeEach(() => {
		mockScope = { type: 'all' }
		storeState = createStoreState()
		loadArchiveSpy.mockReset()
		loadTrashSpy.mockReset()
		restoreEntrySpy.mockReset()
		permanentlyDeleteEntrySpy.mockReset()
		refreshLoadedSlicesSpy.mockReset()
		openDrawerSpy.mockReset()
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
		expect(screen.getAllByRole('button', { name: '删除' })).toHaveLength(3)
		expect(screen.getAllByRole('button', { name: '打开' })).toHaveLength(3)
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

		renderLifecycleList({
			mode: 'trash',
			title: '回收站',
			icon: Trash2Icon,
		})

		await waitFor(() => {
			expect(loadTrashSpy).toHaveBeenCalledWith({ type: 'all' })
		})

		expect(screen.getByText('回收站为空')).toBeInTheDocument()
		expect(screen.getByText('删除后的内容会统一出现在这里，等待恢复或永久删除。')).toBeInTheDocument()
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
