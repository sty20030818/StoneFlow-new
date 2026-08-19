import { useLocation } from '@tanstack/react-router'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Sidebar } from '@heroui-pro/react'

import { ShellSidebar } from '@/layout/ShellSidebar'
import { resolveRememberedPathForScope } from '@/app/navigation'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import {
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
} from '@/features/command'
import { SubmitRegistryProvider } from '@/features/submit'
import { renderWithRouterContext } from '@/test/renderWithRouter'

vi.mock('@/app/navigation', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/app/navigation')>()
	return {
		...actual,
		resolveRememberedPathForScope: vi.fn(actual.resolveRememberedPathForScope),
	}
})

const mockedResolveRememberedPathForScope = vi.mocked(resolveRememberedPathForScope)
const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

describe('ShellSidebar', () => {
	beforeEach(() => {
		mockedResolveRememberedPathForScope.mockImplementation(async ({ defaultPath }) => defaultPath)
	})

	it('按 settings 渲染主导航，并保持设置入口只属于 Settings Mode', async () => {
		await renderShellSidebar({
			...TEST_SETTINGS,
			mainItems: {
				...TEST_SETTINGS.mainItems,
				allTasks: { visible: false, order: 200 },
			},
		})

		expect(screen.getByRole('row', { name: '独立事项' })).toBeInTheDocument()
		expect(screen.queryByRole('row', { name: '所有任务' })).not.toBeInTheDocument()
		expect(screen.getByRole('row', { name: '视图' })).toBeInTheDocument()
		expect(screen.getByRole('row', { name: '项目总览' })).toBeInTheDocument()
		expect(screen.getByRole('row', { name: '归档' })).toBeInTheDocument()
		expect(screen.getByRole('row', { name: '回收站' })).toBeInTheDocument()
		expect(screen.queryByRole('row', { name: '设置' })).not.toBeInTheDocument()
	})

	it('All scope 下隐藏 Space 专属项目导航', async () => {
		await renderShellSidebar(TEST_SETTINGS, [{ id: 'project-1', label: 'StoneFlow VNext' }], {
			currentScope: { type: 'all' },
			currentSpaceId: null,
		})

		expect(screen.getByRole('row', { name: '所有任务' })).toBeInTheDocument()
		expect(screen.getByRole('row', { name: '视图' })).toBeInTheDocument()
		expect(screen.queryByRole('row', { name: '项目总览' })).not.toBeInTheDocument()
		expect(screen.queryByRole('row', { name: '独立事项' })).not.toBeInTheDocument()
		expect(screen.queryByRole('row', { name: 'StoneFlow VNext' })).not.toBeInTheDocument()
		expect(screen.getByText('所有空间')).toBeInTheDocument()
	})

	it('默认 Space 不允许归档或删除', async () => {
		const onArchiveSpace = vi.fn(async () => mockSpaceRemovalResult('space-personal'))
		const onDeleteSpace = vi.fn(async () => mockSpaceRemovalResult('space-personal'))
		await renderShellSidebar(TEST_SETTINGS, [], {
			onArchiveSpace,
			onDeleteSpace,
			spaces: [mockSpace],
		})

		fireEvent.pointerDown(screen.getByRole('button', { name: '切换 Space' }))
		fireEvent.keyDown(await screen.findByRole('menuitem', { name: '编辑空间' }), {
			key: 'ArrowRight',
		})

		const archiveItem = await screen.findByRole('menuitem', { name: '归档' })
		const deleteItem = await screen.findByRole('menuitem', { name: '删除' })
		expect(archiveItem).toHaveAttribute('aria-disabled', 'true')
		expect(deleteItem).toHaveAttribute('aria-disabled', 'true')

		fireEvent.click(archiveItem)
		fireEvent.click(deleteItem)
		expect(onArchiveSpace).not.toHaveBeenCalled()
		expect(onDeleteSpace).not.toHaveBeenCalled()
	})

	it('Space 菜单接通新建与编辑弹窗', async () => {
		await renderShellSidebar(TEST_SETTINGS)

		fireEvent.click(screen.getByRole('button', { name: '切换 Space' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '新建空间' }))
		expect(await screen.findByRole('dialog', { name: '新建 Space' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '关闭' }))
		await waitFor(() => {
			expect(screen.queryByRole('dialog', { name: '新建 Space' })).not.toBeInTheDocument()
		})

		fireEvent.pointerDown(screen.getByRole('button', { name: '切换 Space' }))
		fireEvent.keyDown(await screen.findByRole('menuitem', { name: '编辑空间' }), {
			key: 'ArrowRight',
		})
		fireEvent.click(await screen.findByRole('menuitem', { name: '编辑当前空间' }))
		expect(await screen.findByRole('dialog', { name: '编辑 Space' })).toBeInTheDocument()
	})

	it('从顶部 Space 菜单切换工作空间', async () => {
		await renderShellSidebar(TEST_SETTINGS, [], {
			spaces: [
				mockSpace,
				{
					...mockSpace,
					id: 'space-work',
					name: '工作',
					isDefault: false,
				},
			],
		})

		fireEvent.pointerDown(screen.getByRole('button', { name: '切换 Space' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '工作' }))

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/space-work/standalone')
		})
	})

	it('删除当前非默认 Space 会确认、聚焦弹窗并导航到默认 Space', async () => {
		const onDeleteSpace = vi.fn(async () => mockSpaceRemovalResult('space-work'))
		await renderShellSidebar(TEST_SETTINGS, [], {
			onDeleteSpace,
			spaces: [
				{ ...mockSpace, isDefault: false },
				{
					...mockSpace,
					id: 'space-work',
					name: '工作',
					isDefault: true,
				},
			],
		})

		fireEvent.pointerDown(screen.getByRole('button', { name: '切换 Space' }))
		fireEvent.keyDown(await screen.findByRole('menuitem', { name: '编辑空间' }), {
			key: 'ArrowRight',
		})
		fireEvent.pointerMove(await screen.findByRole('menuitem', { name: '删除' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: '删除' }))

		const dialog = await screen.findByRole('alertdialog')
		await waitFor(() => expect(dialog).toHaveFocus())
		fireEvent.click(screen.getByRole('button', { name: '移入回收站' }))

		await waitFor(() => {
			expect(onDeleteSpace).toHaveBeenCalledWith('space-personal')
			expect(screen.getByTestId('location')).toHaveTextContent('/space-work/tasks')
		})
	})
})

const TEST_SETTINGS: Parameters<typeof ShellSidebar>[0]['settings'] = {
	mainItems: {
		allTasks: { visible: true, order: 200 },
		views: { visible: true, order: 300 },
		projectOverview: { visible: true, order: 400 },
	},
	projectSection: {
		visible: true,
		order: 500,
		collapsed: false,
		showCounts: true,
		showCompleted: true,
		maxVisible: null,
	},
	footerItems: {
		archive: { visible: true, order: 900 },
		trash: { visible: true, order: 1000 },
	},
	width: 256,
	desktopPreference: 'expanded',
}

function renderShellSidebar(
	settings: Parameters<typeof ShellSidebar>[0]['settings'],
	projects: Parameters<typeof ShellSidebar>[0]['projects'] = [
		{
			id: 'project-1',
			label: 'StoneFlow VNext',
		},
	],
	overrides?: Partial<Parameters<typeof ShellSidebar>[0]>,
) {
	return renderWithRouterContext(
		<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>
			<SubmitRegistryProvider>
				<DangerConfirmProvider>
					<Sidebar.Provider defaultOpen toggleShortcut={false}>
						<LocationProbe />
						<ShellSidebar
							currentScope={{ type: 'space', spaceId: 'space-personal' }}
							currentSpaceId='space-personal'
							onArchiveSpace={async () => mockSpaceRemovalResult(null)}
							onCreateSpace={async () => mockSpace}
							onDeleteSpace={async () => mockSpaceRemovalResult(null)}
							onOpenProjectCreateDialog={() => undefined}
							onResetMainItemsVisibility={() => undefined}
							onSetDefaultSpace={async () => mockSpace}
							onUpdateItemVisibility={() => undefined}
							onUpdateSpace={async () => mockSpace}
							projects={projects}
							spaces={[mockSpace]}
							settings={settings}
							{...overrides}
						/>
					</Sidebar.Provider>
				</DangerConfirmProvider>
			</SubmitRegistryProvider>
		</ShortcutRegistryProvider>,
		{
			initialEntry: '/space-personal/standalone',
		},
	)
}

function LocationProbe() {
	const location = useLocation()

	return (
		<div data-testid='location'>
			{location.pathname}
			{location.searchStr}
		</div>
	)
}

const mockSpace = {
	id: 'space-personal',
	name: '个人',
	iconKey: 'user',
	colorKey: 'blue',
	isDefault: true,
	position: 100,
	archivedAt: null,
	deletedAt: null,
	createdAt: '2026-04-30T00:00:00.000Z',
	updatedAt: '2026-04-30T00:00:00.000Z',
}

function mockSpaceRemovalResult(defaultSpaceId: string | null) {
	return {
		space: mockSpace,
		defaultSpaceId,
		affectedProjectCount: 0,
		affectedTaskCount: 0,
	}
}
