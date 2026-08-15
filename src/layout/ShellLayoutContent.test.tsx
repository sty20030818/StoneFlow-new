/** @vitest-environment jsdom */
import type { CSSProperties } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { Sidebar } from '@heroui-pro/react'

import { ShellChrome } from '@/layout/ShellChrome'
import { useShellSidebarController } from '@/layout/model/useShellSidebarController'

vi.mock('@/layout/ShellHeader', () => ({
	ShellHeader: ({ onRunCommand }: { onRunCommand: (id: string) => void }) => (
		<header data-testid='shell-header'>
			<button onClick={() => onRunCommand('layout.toggleSidebar')} type='button'>
				侧边栏按钮
			</button>
		</header>
	),
}))

vi.mock('@/layout/ShellMain', () => ({
	ShellMain: ({ children, isDrawerOpen }: { children: React.ReactNode; isDrawerOpen: boolean }) => (
		<div data-detail-open={isDrawerOpen ? 'true' : 'false'} data-testid='shell-main-content'>
			{children}
		</div>
	),
}))

vi.mock('@/layout/ShellSidebar', () => ({
	ShellSidebar: () => <aside data-testid='sidebar-navigation'>导航</aside>,
}))

vi.mock('@/features/settings', () => ({
	DEFAULT_SETTINGS_SECTION: 'general',
	SettingsSidebar: () => <aside data-testid='sidebar-navigation'>设置导航</aside>,
}))

vi.mock('@/layout/ShellFooter', () => ({
	ShellFooter: () => <footer data-testid='shell-footer' />,
}))

vi.mock('@/features/command', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/command')>()
	return {
		...actual,
		CommandShortcutLayer: ({ onTrigger }: { onTrigger: (id: string) => void }) => (
			<button onClick={() => onTrigger('layout.toggleSidebar')} type='button'>
				左方括号快捷键
			</button>
		),
	}
})

describe('Shell 阶段 D 结构', () => {
	it('桌面只挂载一棵导航树，并由唯一 Sidebar.Main 提供 main landmark', () => {
		installMatchMedia(true)
		render(<Fixture />)

		expect(screen.getAllByTestId('sidebar-navigation')).toHaveLength(1)
		expect(document.querySelectorAll('main')).toHaveLength(1)
		expect(document.querySelector('[data-slot="shell-workspace"]')).toHaveClass(
			'grid-cols-[auto_minmax(0,1fr)]',
		)
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('compact 释放桌面导航占位，打开 Sheet 后仍只挂载同一棵导航树', async () => {
		installMatchMedia(false)
		render(<Fixture />)

		expect(screen.queryByTestId('sidebar-navigation')).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '打开导航' }))

		expect(await screen.findByRole('dialog')).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '关闭导航' })).not.toBeInTheDocument()
		expect(screen.getByRole('dialog')).toHaveClass('pt-12')
		expect(document.querySelector('[data-shell-sidebar-sheet="true"]')).toHaveStyle({
			'--sidebar-width': '100%',
		})
		expect(screen.getAllByTestId('sidebar-navigation')).toHaveLength(1)
		expect(document.querySelector('[data-slot="shell-workspace"]')).toHaveAttribute(
			'data-sidebar-mode',
			'compact',
		)
		expect(document.querySelector('[data-slot="shell-workspace"]')).toHaveClass(
			'grid-cols-[minmax(0,1fr)]',
		)
		expect(document.querySelector('[data-slot="shell-workspace"]')).not.toHaveClass(
			'grid-cols-[auto_minmax(0,1fr)]',
		)
		expect(document.querySelectorAll('main')).toHaveLength(1)
	})

	it('导航 Sheet 打开时不卸载已经存在的任务 Aside', async () => {
		installMatchMedia(false)
		render(<Fixture detailOpen />)

		fireEvent.click(screen.getByRole('button', { name: '打开导航' }))

		expect(await screen.findByRole('dialog')).toBeInTheDocument()
		expect(screen.getByTestId('shell-main-content')).toHaveAttribute('data-detail-open', 'true')
	})
})

function Fixture({ detailOpen = false }: { detailOpen?: boolean }) {
	const sidebar = useShellSidebarController({
		initialPreferences: { width: 256, desktopPreference: 'expanded' },
		onPreferencesCommit: vi.fn(),
	})

	return (
		<Sidebar.Provider
			collapsible='icon'
			onOpenChange={sidebar.setDesktopOpen}
			open={sidebar.providerOpen}
			style={{ '--sidebar-width': `${sidebar.liveWidth}px` } as CSSProperties}
			toggleShortcut={false}
			variant='inset'
		>
			<button onClick={() => sidebar.setMobileSheetOpen(true)} type='button'>
				打开导航
			</button>
			<ShellChrome
				activeSection={'tasks' as never}
				chrome={createChrome()}
				command={createCommand({ isDrawerOpen: detailOpen })}
				createDialog={{ openProjectCreateDialog: vi.fn() } as never}
				currentScope={{ type: 'all' }}
				currentSpaceId={null}
				handleOpenTaskCreate={vi.fn()}
				headerProjects={[]}
				isSettingsMode={false}
				onOpenAbout={vi.fn()}
				onOpenChangelog={vi.fn()}
				routeHistory={createRouteHistory()}
				settingsReturnPath='/'
				shellRoute={{ settingsSection: null } as never}
				sidebar={sidebar}
			>
				<div>内容</div>
			</ShellChrome>
		</Sidebar.Provider>
	)
}

function createChrome() {
	const mutation = { mutateAsync: vi.fn() }
	return {
		archiveSpace: mutation,
		createSpace: mutation,
		deleteSpace: mutation,
		navBadges: {},
		resetSidebarMainItemsVisibility: vi.fn(),
		setDefaultSpace: mutation,
		setSidebarItemVisibility: vi.fn(),
		sidebarProjectLinks: [],
		sidebarSettings: {},
		spaces: [],
		updateSpace: mutation,
	} as never
}

function createCommand(overrides: Record<string, unknown> = {}) {
	return {
		activeDetail: null,
		chordSession: null,
		closeEntityDrawer: vi.fn(),
		commandContext: {},
		commandMenuMode: 'root',
		commandRuntime: {},
		isCommandOpen: false,
		isDrawerOpen: false,
		isShortcutHelpOpen: false,
		onSelectTaskDate: vi.fn(),
		onSelectTaskPlacement: vi.fn(),
		onSelectTaskPriority: vi.fn(),
		onSelectTaskStatus: vi.fn(),
		openTaskPage: vi.fn(),
		runCommand: vi.fn(),
		setChordSession: vi.fn(),
		setCommandOpen: vi.fn(),
		setShortcutHelpOpen: vi.fn(),
		shouldTriggerCommandShortcut: vi.fn(),
		...overrides,
	} as never
}

function createRouteHistory() {
	return {
		canGoBack: false,
		canGoForward: false,
		entries: [],
		navigateToHistoryEntry: vi.fn(),
	} as never
}

function installMatchMedia(desktop: boolean) {
	const mediaQuery = {
		matches: desktop,
		media: '(min-width: 1024px)',
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(() => false),
	} satisfies MediaQueryList

	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: vi.fn(() => mediaQuery),
	})
}
