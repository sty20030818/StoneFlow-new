import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ListTodoIcon } from 'lucide-react'

import {
	COMMAND_IDS,
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
} from '@/features/command'
import { ShellHeader } from '@/layout/ShellHeader'

vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => vi.fn(),
}))

const windowMock = vi.hoisted(() => ({
	close: vi.fn(),
	isMaximized: vi.fn(async () => false),
	minimize: vi.fn(),
	startDragging: vi.fn(async () => undefined),
	toggleMaximize: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', async (importOriginal) => ({
	...(await importOriginal<typeof import('@tauri-apps/api/core')>()),
	isTauri: () => true,
}))

vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: () => windowMock,
}))

vi.mock('@/features/global-search', () => ({
	GlobalSearchInput: () => (
		<div data-sf-search-root='true' data-testid='global-search'>
			<input aria-label='全局搜索' />
		</div>
	),
	resolveProjectSearchTargetPath: () => '/',
}))

vi.mock('@/layout/header/NavBackForward', () => ({ NavBackForward: () => null }))

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

const shortcutRegistry = new KeybindingRegistry(DEFAULT_KEYBINDINGS)
const headerMenus = [
	{ name: '头像', triggerName: '应用菜单', firstItemName: /设置/ },
	{ name: '历史', triggerName: '打开历史记录', firstItemName: /收件箱/ },
]

function renderHeader(onRunCommand = vi.fn()) {
	return render(
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
			routeHistoryEntries={[
				{
					path: '/tasks',
					label: '收件箱',
					spaceId: null,
					spaceName: '全部空间',
					entryIcon: ListTodoIcon,
				},
			]}
			sidebar={
				{
					isCompact: true,
					mobileSheetOpen: false,
					mode: 'compact',
				} as never
			}
			spaces={[]}
		/>,
		{
			wrapper: ({ children }) => (
				<ShortcutRegistryProvider registry={shortcutRegistry}>{children}</ShortcutRegistryProvider>
			),
		},
	)
}

describe('ShellHeader 导航与窗体控件', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		windowMock.isMaximized.mockResolvedValue(false)
		const matchMedia = window.matchMedia
		vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
			...matchMedia(query),
			matches: query === '(min-width: 640px)',
		}))
	})

	it.each(headerMenus)(
		'鼠标打开 $name 菜单保持菜单焦点，外点顶栏关闭后恢复普通焦点',
		async ({ triggerName, firstItemName }) => {
			const { container } = renderHeader()
			vi.spyOn(screen.getByRole('banner'), 'getBoundingClientRect').mockReturnValue(
				new DOMRect(0, 0, 800, 44),
			)
			const trigger = screen.getByRole('button', { name: triggerName })

			fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0, buttons: 1, pointerId: 1 })
			fireEvent.mouseDown(trigger, { button: 0, buttons: 1, detail: 1 })
			fireEvent.pointerUp(trigger, { pointerType: 'mouse', button: 0, pointerId: 1 })
			fireEvent.mouseUp(trigger, { button: 0, detail: 1 })
			fireEvent.click(trigger, { button: 0, detail: 1 })
			const menu = await screen.findByRole('menu')
			// FocusScope 在下一帧纠正失焦；必须覆盖 mousedown 之后的实际结果。
			await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))

			expect(menu).toHaveFocus()
			const firstItem = screen.getByRole('menuitem', { name: firstItemName })
			expect(firstItem).not.toHaveFocus()
			expect(firstItem).not.toHaveAttribute('data-focus-visible', 'true')

			// jsdom 不重定向 inert 命中；显式模拟顶栏坐标上的 body 外点。
			container.setAttribute('inert', '')
			const outside = {
				pointerType: 'mouse',
				button: 0,
				pointerId: 2,
				detail: 1,
				clientX: 300,
				clientY: 22,
			}
			const capture = vi.fn()
			Object.defineProperty(document.body, 'setPointerCapture', {
				configurable: true,
				value: capture,
			})
			try {
				const allowMouseEvents = fireEvent.pointerDown(document.body, { ...outside, buttons: 1 })
				// jsdom 不执行兼容鼠标事件与默认失焦；仅 pointerdown 未取消时补齐浏览器行为。
				if (allowMouseEvents && fireEvent.mouseDown(document.body, { ...outside, buttons: 1 })) {
					act(() => (document.activeElement as HTMLElement).blur())
				}
				await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))

				expect(menu).toHaveFocus()
				expect(firstItem).not.toHaveFocus()
				expect(firstItem).not.toHaveAttribute('data-focus-visible', 'true')
				expect(capture).toHaveBeenCalledExactlyOnceWith(outside.pointerId)

				fireEvent.pointerUp(document.body, outside)
				if (allowMouseEvents) fireEvent.mouseUp(document.body, outside)
				fireEvent.click(document.body, outside)
			} finally {
				Reflect.deleteProperty(document.body, 'setPointerCapture')
			}

			await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
			await waitFor(() => expect(trigger).toHaveFocus())
			expect(trigger).not.toHaveAttribute('data-focus-visible')
			expect(windowMock.startDragging).not.toHaveBeenCalled()
		},
	)

	it('点击搜索框内部保持焦点，点击顶栏空白仍让搜索失焦', () => {
		renderHeader()
		const input = screen.getByRole('textbox', { name: '全局搜索' })
		act(() => input.focus())

		fireEvent.mouseDown(input)
		expect(input).toHaveFocus()

		fireEvent.mouseDown(screen.getByRole('banner'))
		expect(input).not.toHaveFocus()
	})

	it.each(headerMenus)(
		'键盘打开 $name 菜单聚焦首项，Escape 关闭后恢复可见焦点',
		async ({ triggerName, firstItemName }) => {
			renderHeader()
			const trigger = screen.getByRole('button', { name: triggerName })
			fireEvent.keyDown(document, { key: 'Tab' })
			act(() => trigger.focus())
			fireEvent.keyDown(trigger, { key: 'ArrowDown' })
			fireEvent.keyUp(trigger, { key: 'ArrowDown' })

			const firstItem = await screen.findByRole('menuitem', { name: firstItemName })
			expect(firstItem).toHaveFocus()
			expect(firstItem).toHaveAttribute('data-focus-visible', 'true')

			fireEvent.keyDown(firstItem, { key: 'Escape' })
			fireEvent.keyUp(firstItem, { key: 'Escape' })
			await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
			await waitFor(() => expect(trigger).toHaveFocus())
			expect(trigger).toHaveAttribute('data-focus-visible', 'true')
		},
	)

	it('小于 640px 时仍提供可点击的 Sidebar Sheet 开关，macOS 使用原生窗体控件', () => {
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
		renderHeader(onRunCommand)

		const sidebarTrigger = screen.getByRole('button', { name: '展开侧边栏' })
		expect(document.querySelector('header')).toHaveClass('h-11')
		expect(document.querySelector('[data-slot="shell-header-right"]')).toHaveClass('pr-2')
		expect(
			screen.queryByRole('button', { name: /^(最小化|最大化|还原|关闭)窗口$/ }),
		).not.toBeInTheDocument()

		fireEvent.click(sidebarTrigger)
		expect(onRunCommand).toHaveBeenCalledWith(COMMAND_IDS.layoutToggleSidebar)
	})

	it('Windows 窗口按钮各执行一次对应操作，最大化与还原同步可访问名称', async () => {
		Object.defineProperty(window.navigator, 'userAgent', {
			configurable: true,
			value: 'Windows NT 10.0',
		})
		renderHeader()
		await waitFor(() => expect(windowMock.isMaximized).toHaveBeenCalledOnce())

		fireEvent.click(screen.getByRole('button', { name: '最小化窗口' }))
		expect(windowMock.minimize).toHaveBeenCalledOnce()

		windowMock.isMaximized.mockResolvedValueOnce(true)
		fireEvent.click(screen.getByRole('button', { name: '最大化窗口' }))
		const restoreButton = await screen.findByRole('button', { name: '还原窗口' })
		expect(windowMock.toggleMaximize).toHaveBeenCalledOnce()

		windowMock.isMaximized.mockResolvedValueOnce(false)
		fireEvent.click(restoreButton)
		expect(await screen.findByRole('button', { name: '最大化窗口' })).toBeInTheDocument()
		expect(windowMock.toggleMaximize).toHaveBeenCalledTimes(2)

		fireEvent.click(screen.getByRole('button', { name: '关闭窗口' }))
		expect(windowMock.close).toHaveBeenCalledOnce()
	})

	it('双击搜索框不会触发窗口最大化，双击中间空白仍可最大化', async () => {
		Object.defineProperty(window.navigator, 'userAgent', {
			configurable: true,
			value: 'Windows NT 10.0',
		})
		renderHeader()
		const input = screen.getByRole('textbox', { name: '全局搜索' })
		const center = input.closest('[data-slot="shell-header-center"]')!
		fireEvent.doubleClick(input)
		expect(windowMock.toggleMaximize).not.toHaveBeenCalled()

		fireEvent.doubleClick(center)
		await waitFor(() => expect(windowMock.toggleMaximize).toHaveBeenCalledOnce())
	})
})
