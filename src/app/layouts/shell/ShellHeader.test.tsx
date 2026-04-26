import type { ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { ShellHeader } from '@/app/layouts/shell/ShellHeader'
import { SidebarProvider } from '@/shared/ui/base/sidebar'
import { getCurrentWindow } from '@tauri-apps/api/window'

vi.mock('@/features/global-search/ui/GlobalSearchInput', () => ({
	GlobalSearchInput: ({
		currentSpaceId,
	}: {
		currentSpaceId: string
		onOpenProject: (projectId: string) => void
		onOpenTask: (taskId: string) => void
	}) => <div data-sf-search-root='true'>{`mock-search-${currentSpaceId}`}</div>,
}))

vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: vi.fn<typeof getCurrentWindow>(),
}))

const mockedGetCurrentWindow = vi.mocked(getCurrentWindow)

describe('ShellHeader', () => {
	afterEach(() => {
		vi.clearAllMocks()
		window.localStorage.clear()
	})

	it('保留 Tauri 拖拽区并支持窗口控制按钮', async () => {
		const currentWindow = createMockWindow()
		mockedGetCurrentWindow.mockReturnValue(currentWindow)

		renderHeader()

		await waitFor(() => {
			expect(currentWindow.isMaximized).toHaveBeenCalled()
		})

		const leftChrome = document.querySelector('[data-slot="shell-header-left"]')
		const centerChrome = document.querySelector('[data-slot="shell-header-center"]')
		const rightChrome = document.querySelector('[data-slot="shell-header-right"]')
		expect(leftChrome).toBeTruthy()
		expect(centerChrome).toBeTruthy()
		expect(rightChrome).toBeTruthy()
		expect(leftChrome!.className).toContain('w-(--sf-shell-sidebar-reserved-width)')
		expect(leftChrome!.className).toContain('transition-[width]')
		expect(leftChrome!.className).toContain(
			'group-data-[sidebar-resizing=true]/sidebar-wrapper:transition-none',
		)
		expect(leftChrome!.className).toContain(
			'group-data-[sidebar-mode=desktop-expanded]/sidebar-wrapper:pl-3',
		)
		expect(leftChrome!.className).toContain('group-data-[sidebar-layout=mobile]/sidebar-wrapper:w-max')
		expect(centerChrome!.className).toContain('justify-center')
		expect(screen.getByRole('banner').className).toContain('gap-3')
		expect(screen.getByRole('banner')).toHaveAttribute('data-tauri-drag-region')
		expect(document.querySelector('[data-slot="shell-header-nav"]')).toHaveAttribute(
			'data-tauri-drag-region',
		)
		expect(document.querySelector('[data-slot="shell-header-right"]')).toHaveAttribute(
			'data-tauri-drag-region',
		)
		expect(screen.getByRole('button', { name: '打开历史记录' })).not.toHaveAttribute(
			'data-tauri-drag-region',
		)
		expect(document.querySelector('[data-sf-search-root="true"]')).not.toHaveAttribute(
			'data-tauri-drag-region',
		)
		expect(screen.getByRole('img', { name: '当前用户头像' })).toHaveAttribute(
			'data-tauri-drag-region',
		)
		expect(screen.queryByText('StoneFlow')).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'StoneFlow' }).className).toContain('rounded-full')
		expect(screen.getByRole('button', { name: 'StoneFlow' }).className).toContain('size-[30px]')
		const sidebarTrigger = document.querySelector('[data-slot="sidebar-trigger"]')
		expect(sidebarTrigger?.className).toContain('rounded-full')
		expect(sidebarTrigger?.className).toContain('size-[30px]')
		expect(screen.getByRole('button', { name: '打开历史记录' }).className).toContain('rounded-full')
		expect(screen.getByRole('button', { name: '打开历史记录' }).className).toContain('size-[30px]')
		expect(screen.getByRole('button', { name: '打开历史记录' }).className).toContain(
			'focus-visible:ring-0',
		)
		expect(screen.getByRole('button', { name: '后退' }).className).toContain('rounded-full')
		expect(screen.getByRole('button', { name: '前进' }).className).toContain('rounded-full')
		expect(document.querySelector('[data-slot="shell-header-nav"]')?.className).toContain('gap-1')
		const avatarImages = document.querySelectorAll('img[src="/avatar.jpg"]')
		expect(avatarImages.length).toBe(2)
		expect(screen.getByRole('img', { name: '当前用户头像' })).toHaveAttribute('src', '/avatar.jpg')
		expect(screen.getByRole('img', { name: '当前用户头像' }).className).toContain('size-7.5')
		expect(screen.queryByRole('button', { name: '打开设置' })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '后退' })).toBeDisabled()
		expect(screen.getByRole('button', { name: '前进' })).toBeDisabled()

		const closeButton = screen.getByRole('button', { name: '关闭窗口' })
		expect(screen.getByRole('button', { name: '最小化窗口' }).className).toContain('h-10 w-10')
		expect(screen.getByRole('button', { name: '最大化窗口' }).className).toContain('h-10 w-10')
		expect(closeButton.className).toContain('h-10 w-10')
		expect(screen.getByRole('button', { name: '最小化窗口' }).className).toContain('rounded-md')
		expect(screen.getByRole('button', { name: '最大化窗口' }).className).toContain('rounded-md')
		expect(closeButton.className).toContain('rounded-md')
		expect(document.querySelector('[aria-label="最小化窗口"]')?.parentElement?.className).toContain(
			'gap-1',
		)
		expect(document.querySelector('[aria-label="最小化窗口"]')?.parentElement?.className).toContain(
			'p-1',
		)
		expect(screen.getByRole('button', { name: '最小化窗口' }).className).toContain(
			'hover:bg-(--sf-color-shell-hover-strong)',
		)
		expect(screen.getByRole('button', { name: '最大化窗口' }).className).toContain(
			'hover:bg-(--sf-color-shell-hover-strong)',
		)
		expect(closeButton.className).toContain('hover:bg-[#E81123]')

		fireEvent.click(screen.getByRole('button', { name: '最小化窗口' }))
		fireEvent.click(screen.getByRole('button', { name: '最大化窗口' }))
		fireEvent.click(closeButton)

		await waitFor(() => {
			expect(currentWindow.minimize).toHaveBeenCalledTimes(1)
			expect(currentWindow.toggleMaximize).toHaveBeenCalledTimes(1)
			expect(currentWindow.close).toHaveBeenCalledTimes(1)
		})
	})

	it('<640 不渲染左侧整条（含侧栏折叠、历史等）', async () => {
		mockedGetCurrentWindow.mockReturnValue(createMockWindow())

		renderHeader({}, { matchMedia: 'narrow' })

		await waitFor(() => {
			expect(document.querySelector('[data-slot="shell-header-center"]')).toBeTruthy()
		})
		expect(document.querySelector('[data-slot="sidebar-trigger"]')).toBeNull()
		expect(screen.queryByRole('button', { name: '打开历史记录' })).toBeNull()
		expect(screen.queryByRole('button', { name: '展开侧边栏' })).toBeNull()
		expect(screen.queryByRole('button', { name: '收起侧边栏' })).toBeNull()
		expect(document.querySelector('[data-slot="shell-header-left"]')).toBeNull()
		expect(document.querySelector('[data-slot="shell-header-right"]')).toBeTruthy()
	})

	it('历史记录下拉左对齐触发按钮且不展示当前路由', async () => {
		mockedGetCurrentWindow.mockReturnValue(createMockWindow())

		renderHeader()

		fireEvent.pointerDown(screen.getByRole('button', { name: '打开历史记录' }))

		await waitFor(() => {
			expect(screen.getByText('最近浏览')).toBeInTheDocument()
			expect(screen.getByRole('menuitem', { name: '暂无历史记录' })).toBeInTheDocument()
		})
		expect(screen.queryByRole('menuitem', { name: /Inbox工作/ })).not.toBeInTheDocument()
	})

	it('支持 Command 快捷键和新建任务快捷键，并忽略输入内按键', () => {
		const onCommandOpenChange = vi.fn<(open: boolean) => void>()
		const onOpenTaskCreateDialog = vi.fn<() => void>()

		mockedGetCurrentWindow.mockReturnValue(createMockWindow())

		renderHeader({
			onCommandOpenChange,
			onOpenTaskCreateDialog,
		})

		fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
		fireEvent.keyDown(window, { key: 'c' })

		expect(onCommandOpenChange).toHaveBeenCalledWith(true)
		expect(onOpenTaskCreateDialog).toHaveBeenCalledTimes(1)

		const input = document.createElement('input')
		document.body.appendChild(input)
		input.focus()

		fireEvent.keyDown(input, { key: 'c' })

		expect(onOpenTaskCreateDialog).toHaveBeenCalledTimes(1)

		input.remove()
	})

	it('在 Command 中使用真实 Badge 表达项目状态', () => {
		mockedGetCurrentWindow.mockReturnValue(createMockWindow())

		renderHeader({
			isCommandOpen: true,
			projects: [
				{
					id: 'project-1',
					label: '执行层',
					badge: 'active',
					children: [],
				},
				{
					id: 'project-2',
					label: '产品设计',
					badge: 'paused',
					children: [],
				},
			],
		})

		expect(screen.getByText('active')).toHaveAttribute('data-variant', 'primary')
		expect(screen.getByText('paused')).toHaveAttribute('data-variant', 'warning')
	})
})

type RenderHeaderOptions = {
	/** 默认 `desktop`：`renderHeader` 会安装 `matchMedia`；`narrow` 用于 &lt;640 顶栏不渲染左条等场景 */
	matchMedia?: 'desktop' | 'narrow'
}

function renderHeader(
	overrides: Partial<ComponentProps<typeof ShellHeader>> = {},
	options: RenderHeaderOptions = {},
) {
	if (options.matchMedia === 'narrow') {
		installMatchMediaNarrowPhone()
	} else {
		installMatchMediaDesktop()
	}

	const props: ComponentProps<typeof ShellHeader> = {
		currentSpaceId: 'work',
		activeSection: 'inbox',
		isCommandOpen: false,
		isProjectsLoading: false,
		projects: [
			{
				id: 'project-1',
				label: '执行层',
				badge: 'active',
				children: [],
			},
		],
		projectsError: null,
		onCommandOpenChange: vi.fn<(open: boolean) => void>(),
		onOpenTaskCreateDialog: vi.fn<() => void>(),
		onOpenProjectCreateDialog: vi.fn<() => void>(),
		onOpenDrawer: vi.fn<(kind: 'task' | 'project', id: string) => void>(),
		onCloseDrawer: vi.fn<() => void>(),
		...overrides,
	}

	// Windows 壳层行为：避免 JSDOM 默认 UA 含 `Mac` 导致 isMac 误判
	installNavigatorWindows()

	// 与 sidebar 一致：由 options.matchMedia 或上方分支决定；未传时 `desktop`

	return render(
		<SidebarProvider>
			<MemoryRouter initialEntries={['/space/work/inbox']}>
				<ShellHeader {...props} />
			</MemoryRouter>
		</SidebarProvider>,
	)
}

function installNavigatorWindows() {
	Object.defineProperty(window.navigator, 'userAgent', {
		configurable: true,
		get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
	})
}

function installMatchMediaDesktop() {
	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: (query: string) =>
			({
				matches: true,
				media: query,
				onchange: null,
				addEventListener: () => undefined,
				removeEventListener: () => undefined,
				addListener: () => undefined,
				removeListener: () => undefined,
				dispatchEvent: () => false,
			}) as unknown as MediaQueryList,
	})
}

/** 与顶栏 `max-sm`(640) / 侧栏 1024 断点一致：小屏不匹桌面宽 */
function installMatchMediaNarrowPhone() {
	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: (query: string) => {
			const matches = query.includes('640px')
				? false
				: query.includes('1024px')
					? false
					: true
			return {
				matches,
				media: query,
				onchange: null,
				addEventListener: () => undefined,
				removeEventListener: () => undefined,
				addListener: () => undefined,
				removeListener: () => undefined,
				dispatchEvent: () => false,
			} as unknown as MediaQueryList
		},
	})
}

function createMockWindow() {
	return {
		isMaximized: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
		minimize: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		toggleMaximize: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		close: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
	} as unknown as ReturnType<typeof getCurrentWindow>
}
