import React from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import type { ShellSidebarSettings } from '@/app/layouts/shell/model/shellDevicePreferences'
import { SettingsPage } from '@/features/settings/ui/SettingsPage'
import type { Space } from '@/shared/types'
import { renderWithRouterContext } from '@/test-utils/renderWithRouter'

const loadSidebarSettingsSpy = vi.fn<() => Promise<void>>()
const setItemVisibilitySpy =
	vi.fn<(target: { kind: 'main'; key: string }, visible: boolean) => Promise<void>>()
const setProjectSectionConfigSpy =
	vi.fn<(config: ShellSidebarSettings['projectSection']) => Promise<void>>()
const loadSpacesSpy = vi.fn<() => Promise<void>>()
const setDefaultSpaceSpy = vi.fn<(spaceId: string) => Promise<Space>>()

let sidebarStoreState = createSidebarStoreState()
let spaceStoreState = createSpaceStoreState()

vi.mock('@/app/layouts/shell/model/useSidebarSettingsStore', () => ({
	selectSidebarSettings: (state: typeof sidebarStoreState) => state.settings,
	selectSidebarSettingsStatus: (state: typeof sidebarStoreState) => state.status,
	selectSidebarSettingsError: (state: typeof sidebarStoreState) => state.errorMessage,
	useSidebarSettingsStore: (selector: (state: typeof sidebarStoreState) => unknown) =>
		selector(sidebarStoreState),
}))

vi.mock('@/features/space/query', () => ({
	useSpaces: () => ({
		spaces: spaceStoreState.spaces,
		status: spaceStoreState.status,
		error: spaceStoreState.error,
		refetch: loadSpacesSpy,
	}),
	useSetDefaultSpaceMutation: () => ({
		mutateAsync: setDefaultSpaceSpy,
	}),
}))

vi.mock('@/app/layouts/shell/model/ShellRouteContext', () => ({
	useCurrentShellRoute: () => ({
		kind: 'shell-section',
		scope: { type: 'all' },
		spaceId: null,
		section: 'settings',
	}),
}))

vi.mock('@/shared/ui/base/select', () => {
	type SelectContextValue = {
		value?: string
		onValueChange?: (value: string) => void
		disabled?: boolean
	}

	type SelectItemProps = {
		value: string
		children: React.ReactNode
	}

	const SelectContext = React.createContext<SelectContextValue | null>(null)
	function MockSelectItem(_props: SelectItemProps) {
		return null
	}

	function collectSelectItems(children: React.ReactNode): SelectItemProps[] {
		const items: SelectItemProps[] = []

		React.Children.forEach(children, (child) => {
			if (!React.isValidElement(child)) {
				return
			}

			if (child.type === MockSelectItem) {
				items.push((child as React.ReactElement<SelectItemProps>).props)
				return
			}

			const nestedChildren = (child as React.ReactElement<{ children?: React.ReactNode }>).props
				.children
			if (nestedChildren) {
				items.push(...collectSelectItems(nestedChildren))
			}
		})

		return items
	}

	return {
		Select: ({
			value,
			onValueChange,
			disabled,
			children,
		}: {
			value?: string
			onValueChange?: (value: string) => void
			disabled?: boolean
			children: React.ReactNode
		}) => {
			const items = collectSelectItems(children)
			const trigger = React.Children.toArray(children).find(
				(child) => React.isValidElement(child) && child.type === MockSelectTrigger,
			)
			const triggerProps =
				React.isValidElement(trigger) && typeof trigger.props === 'object'
					? (trigger.props as Record<string, unknown>)
					: {}

			return (
				<SelectContext.Provider value={{ value, onValueChange, disabled }}>
					<label className='contents'>
						<select
							aria-label={triggerProps['aria-label'] as string | undefined}
							disabled={disabled}
							onChange={(event) => onValueChange?.(event.currentTarget.value)}
							value={value}
						>
							{items.map((item) => (
								<option key={item.value} value={item.value}>
									{item.children}
								</option>
							))}
						</select>
					</label>
				</SelectContext.Provider>
			)
		},
		SelectTrigger: MockSelectTrigger,
		SelectValue: () => null,
		SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		SelectGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		SelectItem: MockSelectItem,
	}

	function MockSelectTrigger({ children }: { children?: React.ReactNode; 'aria-label'?: string }) {
		const context = React.useContext(SelectContext)
		return <>{context ? children : null}</>
	}
})

describe('SettingsPage', () => {
	beforeEach(() => {
		loadSidebarSettingsSpy.mockReset()
		loadSidebarSettingsSpy.mockResolvedValue(undefined)
		setItemVisibilitySpy.mockReset()
		setItemVisibilitySpy.mockResolvedValue(undefined)
		setProjectSectionConfigSpy.mockReset()
		setProjectSectionConfigSpy.mockResolvedValue(undefined)
		loadSpacesSpy.mockReset()
		loadSpacesSpy.mockResolvedValue(undefined)
		setDefaultSpaceSpy.mockReset()
		setDefaultSpaceSpy.mockImplementation(async (spaceId) => {
			const nextDefaultSpace = spaceStoreState.spaces.find((space) => space.id === spaceId)
			if (!nextDefaultSpace) {
				throw new Error('space not found')
			}
			return nextDefaultSpace
		})

		sidebarStoreState = createSidebarStoreState()
		spaceStoreState = createSpaceStoreState()
	})

	it('渲染真实设置项并触发初始化加载', async () => {
		await renderSettingsPage()

		await waitFor(() => {
			expect(loadSidebarSettingsSpy).toHaveBeenCalledTimes(1)
		})

		expect(screen.getByText('工作区设置')).toBeInTheDocument()
		expect(screen.getByText('Sidebar 主入口')).toBeInTheDocument()
		expect(screen.getByText('辅助入口')).toBeInTheDocument()
		expect(screen.getByText('项目分区')).toBeInTheDocument()
		expect(screen.getByText('默认空间')).toBeInTheDocument()
		expect(screen.queryByText('设置功能建设中')).not.toBeInTheDocument()
	})

	it('切换主入口显隐时调用 sidebar settings store', async () => {
		await renderSettingsPage()

		fireEvent.click(getCheckboxByLabel('所有任务'))

		await waitFor(() => {
			expect(setItemVisibilitySpy).toHaveBeenCalledWith({ kind: 'main', key: 'allTasks' }, false)
		})
	})

	it('切换辅助入口显隐时调用 sidebar settings store', async () => {
		await renderSettingsPage()

		fireEvent.click(getCheckboxByLabel('回收站'))

		await waitFor(() => {
			expect(setItemVisibilitySpy).toHaveBeenCalledWith({ kind: 'footer', key: 'trash' }, false)
		})
	})

	it('修改 projects section 配置时调用更新方法', async () => {
		await renderSettingsPage()

		fireEvent.click(getCheckboxByLabel('显示已完成项目'))

		await waitFor(() => {
			expect(setProjectSectionConfigSpy).toHaveBeenCalledWith({
				...sidebarStoreState.settings!.projectSection,
				showCompleted: false,
			})
		})
	})

	it('切换默认 Space 时调用 setDefaultSpace', async () => {
		await renderSettingsPage()

		fireEvent.change(screen.getByLabelText('默认空间'), { target: { value: 'space-2' } })

		await waitFor(() => {
			expect(setDefaultSpaceSpy).toHaveBeenCalledWith('space-2')
		})
	})
})

async function renderSettingsPage() {
	return renderWithRouterContext(<SettingsPage />)
}

function getCheckboxByLabel(label: string) {
	const container = screen.getByText(label).closest('label')
	if (!container) {
		throw new Error(`未找到 ${label} 对应的设置项容器`)
	}

	const input = container.querySelector('input[type="checkbox"]')
	if (!(input instanceof HTMLInputElement)) {
		throw new Error(`未找到 ${label} 对应的 checkbox`)
	}

	return input
}

function createSidebarStoreState() {
	return {
		status: 'ready' as const,
		settings: createSidebarSettings(),
		errorMessage: null,
		load: loadSidebarSettingsSpy,
		resetMainItemsVisibility: vi.fn(),
		setItemVisibility: setItemVisibilitySpy,
		setSidebarWidth: vi.fn(),
		setDesktopPreference: vi.fn(),
		setProjectSectionConfig: setProjectSectionConfigSpy,
	}
}

function createSpaceStoreState() {
	return {
		spaces: [
			createSpace({ id: 'space-1', name: '工作', isDefault: true }),
			createSpace({ id: 'space-2', name: '生活', isDefault: false }),
		],
		status: 'ready' as const,
		error: null,
		load: loadSpacesSpy,
		createSpace: vi.fn(),
		updateSpace: vi.fn(),
		setDefaultSpace: setDefaultSpaceSpy,
		archiveSpace: vi.fn(),
		restoreSpace: vi.fn(),
		deleteSpace: vi.fn(),
	}
}

function createSidebarSettings(): ShellSidebarSettings {
	return {
		mainItems: {
			inbox: { visible: true, order: 100 },
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
}

function createSpace(overrides: Partial<Space> & Pick<Space, 'id' | 'name' | 'isDefault'>): Space {
	return {
		id: overrides.id,
		name: overrides.name,
		iconKey: overrides.iconKey ?? 'briefcase',
		colorKey: overrides.colorKey ?? 'blue',
		isDefault: overrides.isDefault,
		sortOrder: overrides.sortOrder ?? 100,
		archivedAt: overrides.archivedAt ?? null,
		deletedAt: overrides.deletedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-05-03T10:00:00Z',
		updatedAt: overrides.updatedAt ?? '2026-05-03T10:00:00Z',
	}
}
