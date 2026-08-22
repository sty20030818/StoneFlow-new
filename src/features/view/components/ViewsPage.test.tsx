import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

import type { View } from '@/shared/types'

import { SavedViewPage } from './SavedViewPage'
import { ViewsPage } from './ViewsPage'

const { useLibrarySceneMock, useWorkspaceSceneMock, workspacePropsSpy } = vi.hoisted(() => ({
	useLibrarySceneMock: vi.fn(),
	useWorkspaceSceneMock: vi.fn(),
	workspacePropsSpy: vi.fn(),
}))

vi.mock('../hooks/useViewsScene', () => ({
	useSavedViewLibraryScene: useLibrarySceneMock,
	useSavedViewWorkspaceScene: useWorkspaceSceneMock,
}))

vi.mock('@/features/command', () => ({
	COMMAND_IDS: { newFullTask: 'task.new' },
	CommandShortcut: () => null,
}))

vi.mock('@/features/task', () => ({
	TaskBoard: ({ tasks }: { tasks: Array<{ title: string }> }) => (
		<div>{tasks.map((task) => task.title).join(',')}</div>
	),
}))

vi.mock('@/features/task-workspace', () => ({
	TaskWorkspace: (props: {
		headerActions: ReactNode
		children: ReactNode
		onViewChange: (key: string) => void
	}) => {
		workspacePropsSpy(props)
		return (
			<section aria-label='任务工作区'>
				{props.headerActions}
				<button onClick={() => props.onViewChange('today')} type='button'>
					切换到今天
				</button>
				{props.children}
			</section>
		)
	},
}))

vi.mock('@/shared/components/AppBreadcrumb', () => ({
	AppBreadcrumb: ({ items }: { items: Array<{ label: string }> }) => (
		<nav>{items.map((item) => item.label).join(' / ')}</nav>
	),
}))

vi.mock('@/shared/components/page-frame', () => ({
	PageFrame: {
		Root: ({ children }: { children: ReactNode }) => <div>{children}</div>,
		Header: ({ breadcrumb, actions }: { breadcrumb?: ReactNode; actions?: ReactNode }) => (
			<header>
				{breadcrumb}
				{actions}
			</header>
		),
		Body: ({ children }: { children: ReactNode }) => <main>{children}</main>,
	},
}))

vi.mock('./ViewEditorDialog', () => ({
	ViewEditorDialog: ({ open }: { open: boolean }) => (open ? <div>视图编辑器</div> : null),
}))

const savedView: View = {
	id: 'view-1',
	name: '重点任务',
	scope: { type: 'all' },
	context: { kind: 'all' },
	baseViewKey: 'active',
	filters: { clauses: [] },
	position: 100,
	createdAt: '2026-08-19T00:00:00Z',
	updatedAt: '2026-08-19T00:00:00Z',
}

const editor = {
	open: false,
	view: null,
	projects: [],
	isSubmitting: false,
	openCreate: vi.fn(),
	openEdit: vi.fn(),
	onClose: vi.fn(),
	onCreate: vi.fn(async () => undefined),
	onUpdate: vi.fn(async () => undefined),
}

describe('Saved View pages', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		useLibrarySceneMock.mockReturnValue({
			breadcrumbItems: [{ key: 'views', label: '保存视图', current: true }],
			views: [savedView],
			status: 'ready',
			search: '',
			setSearch: vi.fn(),
			editor,
			openView: vi.fn(),
			deleteView: vi.fn(async () => undefined),
		})
		useWorkspaceSceneMock.mockReturnValue(buildWorkspaceScene())
	})

	it('根页只管理保存视图的搜索、打开与创建', () => {
		const scene = useLibrarySceneMock()
		useLibrarySceneMock.mockReturnValue(scene)
		render(<ViewsPage />)

		fireEvent.change(screen.getByRole('textbox', { name: '搜索保存视图' }), {
			target: { value: '重点' },
		})
		expect(scene.setSearch).toHaveBeenCalledWith('重点')

		fireEvent.click(screen.getByRole('button', { name: /重点任务/ }))
		expect(scene.openView).toHaveBeenCalledWith(savedView)

		fireEvent.click(screen.getByRole('button', { name: '新建保存视图' }))
		expect(editor.openCreate).toHaveBeenCalledOnce()
		expect(screen.queryByText('系统视图')).not.toBeInTheDocument()
	})

	it('详情页把保存视图交给唯一 TaskWorkspace，并保留任务与视图操作', async () => {
		const scene = useWorkspaceSceneMock()
		useWorkspaceSceneMock.mockReturnValue(scene)
		render(<SavedViewPage />)

		expect(screen.getByRole('region', { name: '任务工作区' })).toBeInTheDocument()
		expect(screen.getByText('写阶段总结')).toBeInTheDocument()
		expect(workspacePropsSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				selectedViewKey: 'saved:view-1',
				views: scene.toolbarPills,
			}),
		)

		fireEvent.click(screen.getByRole('button', { name: '切换到今天' }))
		expect(scene.selectToolbar).toHaveBeenCalledWith('today')
		fireEvent.click(screen.getByRole('button', { name: '创建任务' }))
		expect(scene.openTaskCreateDialog).toHaveBeenCalledOnce()

		fireEvent.click(screen.getByRole('button', { name: '视图操作' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '删除保存视图' }))
		expect(scene.deleteActiveView).toHaveBeenCalledOnce()
	})

	it('详情缺失时返回保存视图库', () => {
		const scene = { ...buildWorkspaceScene(), activeView: null, viewStatus: 'not-found' }
		useWorkspaceSceneMock.mockReturnValue(scene)
		render(<SavedViewPage />)

		expect(screen.getByText('找不到保存视图')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '返回保存视图' }))
		expect(scene.openLibrary).toHaveBeenCalledOnce()
	})

	it('旧定义损坏时保留 Library 删除入口但禁止编辑', async () => {
		const invalidView = { ...savedView, definitionError: '无法无损升级' }
		const scene = { ...useLibrarySceneMock(), views: [invalidView] }
		useLibrarySceneMock.mockReturnValue(scene)
		render(<ViewsPage />)

		expect(screen.getByText('需要重建')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '视图操作' }))
		expect(screen.queryByRole('menuitem', { name: '编辑保存视图' })).not.toBeInTheDocument()
		fireEvent.click(await screen.findByRole('menuitem', { name: '删除保存视图' }))
		expect(scene.deleteView).toHaveBeenCalledWith(invalidView)
	})

	it('旧定义损坏的详情页不执行任务工作区', () => {
		const scene = {
			...buildWorkspaceScene(),
			activeView: { ...savedView, definitionError: '无法无损升级' },
			viewStatus: 'invalid-definition',
		}
		useWorkspaceSceneMock.mockReturnValue(scene)
		render(<SavedViewPage />)

		expect(screen.getByText('保存视图需要重建')).toBeInTheDocument()
		expect(screen.queryByRole('region', { name: '任务工作区' })).not.toBeInTheDocument()
	})
})

function buildWorkspaceScene() {
	return {
		activeView: savedView,
		viewStatus: 'ready',
		breadcrumbItems: [{ key: 'view-1', label: savedView.name, current: true }],
		displayPageKey: 'view:view-1',
		filterUiValue: {},
		taskCollection: { boardProps: { tasks: [{ title: '写阶段总结' }] } },
		toolbarPills: [
			{ key: 'saved:view-1', label: savedView.name },
			{ key: 'today', label: '今天' },
		],
		selectedToolbarKey: 'saved:view-1',
		selectToolbar: vi.fn(),
		openTaskCreateDialog: vi.fn(),
		openLibrary: vi.fn(),
		editor,
		deleteActiveView: vi.fn(async () => undefined),
	}
}
