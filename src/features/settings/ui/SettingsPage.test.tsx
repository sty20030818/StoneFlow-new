import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import type { ShellSidebarSettings } from '@/app/layouts/shell/model/shellDevicePreferences'
import { SettingsPage } from '@/features/settings/ui/SettingsPage'
import type { Space } from '@/shared/types'

const loadSidebarSettingsSpy = vi.fn<() => Promise<void>>()
const setItemVisibilitySpy =
	vi.fn<(target: { kind: 'main'; key: string }, visible: boolean) => Promise<void>>()
const setProjectSectionConfigSpy =
	vi.fn<(config: ShellSidebarSettings['projectSection']) => Promise<void>>()
const setSidebarWidthSpy = vi.fn<(width: number) => Promise<void>>()
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

vi.mock('@/features/space/model/useSpaceStore', () => ({
	selectSpaces: (state: typeof spaceStoreState) => state.spaces,
	selectSpaceStatus: (state: typeof spaceStoreState) => state.status,
	selectSpaceError: (state: typeof spaceStoreState) => state.error,
	useSpaceStore: (selector: (state: typeof spaceStoreState) => unknown) =>
		selector(spaceStoreState),
}))

vi.mock('@/app/routing', async () => {
	const actual = await vi.importActual<typeof import('@/app/routing')>('@/app/routing')
	return {
		...actual,
		useShellRoute: () => ({
			scope: { type: 'all' },
			spaceId: null,
		}),
	}
})

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
		setSidebarWidthSpy.mockReset()
		setSidebarWidthSpy.mockResolvedValue(undefined)
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
		renderSettingsPage()

		await waitFor(() => {
			expect(loadSidebarSettingsSpy).toHaveBeenCalledTimes(1)
			expect(loadSpacesSpy).toHaveBeenCalledTimes(1)
		})

		expect(screen.getByText('V1 页面设置')).toBeInTheDocument()
		expect(screen.getByText('Sidebar 主入口')).toBeInTheDocument()
		expect(screen.getByText('Projects Section')).toBeInTheDocument()
		expect(screen.getByText('Sidebar Width')).toBeInTheDocument()
		expect(screen.getByText('默认 Space')).toBeInTheDocument()
		expect(screen.queryByText('设置功能建设中')).not.toBeInTheDocument()
	})

	it('切换主入口显隐时调用 sidebar settings store', async () => {
		renderSettingsPage()

		fireEvent.click(getCheckboxByLabel('All Tasks'))

		await waitFor(() => {
			expect(setItemVisibilitySpy).toHaveBeenCalledWith({ kind: 'main', key: 'allTasks' }, false)
		})
	})

	it('修改 projects section 配置时调用更新方法', async () => {
		renderSettingsPage()

		fireEvent.click(getCheckboxByLabel('显示已完成项目'))

		await waitFor(() => {
			expect(setProjectSectionConfigSpy).toHaveBeenCalledWith({
				...sidebarStoreState.settings!.projectSection,
				showCompleted: false,
			})
		})
	})

	it('提交 Sidebar 宽度时调用宽度更新', async () => {
		renderSettingsPage()

		const widthInput = screen.getByLabelText('宽度（px）')
		fireEvent.change(widthInput, { target: { value: '320' } })
		fireEvent.blur(widthInput)

		await waitFor(() => {
			expect(setSidebarWidthSpy).toHaveBeenCalledWith(320)
		})
	})

	it('切换默认 Space 时调用 setDefaultSpace', async () => {
		renderSettingsPage()

		fireEvent.change(screen.getByLabelText('默认 Space'), { target: { value: 'space-2' } })

		await waitFor(() => {
			expect(setDefaultSpaceSpy).toHaveBeenCalledWith('space-2')
		})
	})
})

function renderSettingsPage() {
	return render(
		<MemoryRouter>
			<SettingsPage />
		</MemoryRouter>,
	)
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
		setSidebarWidth: setSidebarWidthSpy,
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
