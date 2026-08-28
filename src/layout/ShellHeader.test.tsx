import { fireEvent, render, screen } from '@testing-library/react'

import { COMMAND_IDS } from '@/features/command'
import { ShellHeader } from '@/layout/ShellHeader'

vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => vi.fn(),
}))

vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: () => ({
		close: vi.fn(),
		isMaximized: vi.fn(async () => false),
		minimize: vi.fn(),
		toggleMaximize: vi.fn(),
	}),
}))

vi.mock('@/features/global-search', () => ({
	GlobalSearchInput: () => <div data-testid='global-search' />,
	resolveProjectSearchTargetPath: () => '/',
}))

vi.mock('@/layout/header/HistoryDropdown', () => ({ HistoryDropdown: () => null }))
vi.mock('@/layout/header/NavBackForward', () => ({ NavBackForward: () => null }))
vi.mock('@/layout/header/UserAppMenu', () => ({ UserAppMenu: () => null }))

vi.mock('@/features/command', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/command')>()
	return {
		...actual,
		ChordHint: () => null,
		CommandMenu: () => null,
		CommandTooltipRow: ({ label }: { label: string }) => <span>{label}</span>,
		ShortcutHelp: () => null,
	}
})

describe('ShellHeader compact 导航入口', () => {
	it('小于 640px 时仍提供可点击的 Sidebar Sheet 开关', () => {
		Object.defineProperty(window.navigator, 'userAgent', {
			configurable: true,
			value: 'Macintosh',
		})
		Object.defineProperty(window, 'matchMedia', {
			configurable: true,
			value: vi.fn((query: string) => ({
				matches: query === '(min-width: 640px)' ? false : true,
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(() => false),
			})),
		})

		const onRunCommand = vi.fn()
		render(
			<ShellHeader
				activeSection={'tasks' as never}
				canGoBack={false}
				canGoForward={false}
				chordSession={null}
				commandContext={{} as never}
				commandMenuMode={'root' as never}
				commandRuntime={{} as never}
				currentScope={{ type: 'all' }}
				currentSpaceId={null}
				isCommandOpen={false}
				isShortcutHelpOpen={false}
				onCloseDrawer={vi.fn()}
				onCommandOpenChange={vi.fn()}
				onNavigateToHistoryEntry={vi.fn()}
				onOpenAbout={vi.fn()}
				onOpenChangelog={vi.fn()}
				onOpenTaskPage={vi.fn()}
				onRunCommand={onRunCommand}
				onSelectTaskDate={vi.fn()}
				onSelectTaskPlacement={vi.fn()}
				onSelectTaskPriority={vi.fn()}
				onSelectTaskStatus={vi.fn()}
				onShortcutHelpOpenChange={vi.fn()}
				projects={[]}
				routeHistoryEntries={[]}
				sidebar={
					{
						isCompact: true,
						mobileSheetOpen: false,
						mode: 'compact',
					} as never
				}
				spaces={[]}
			/>,
		)

		const sidebarTrigger = screen.getByRole('button', { name: '展开侧边栏' })
		expect(document.querySelector('header')).toHaveClass('h-11')
		expect(document.querySelector('[data-slot="shell-header-right"]')).toHaveClass('pr-2')

		fireEvent.click(sidebarTrigger)
		expect(onRunCommand).toHaveBeenCalledWith(COMMAND_IDS.layoutToggleSidebar)
	})
})
