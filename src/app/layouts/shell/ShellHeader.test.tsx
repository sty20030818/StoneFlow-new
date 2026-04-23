import type { ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { ShellHeader } from '@/app/layouts/shell/ShellHeader'
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
	})

	it('保留 Tauri 拖拽区并支持窗口控制按钮', async () => {
		const currentWindow = createMockWindow()
		mockedGetCurrentWindow.mockReturnValue(currentWindow)

		renderHeader()

		await waitFor(() => {
			expect(currentWindow.isMaximized).toHaveBeenCalled()
		})

		expect(screen.getByRole('banner').className).toContain('pl-0 pr-0')
		expect(screen.getByRole('banner')).toHaveAttribute('data-tauri-drag-region')
		expect(document.querySelectorAll('[data-tauri-drag-region]')).toHaveLength(6)
		expect(screen.getByRole('button', { name: '打开历史记录' })).not.toHaveAttribute(
			'data-tauri-drag-region',
		)
		expect(document.querySelector('[data-sf-search-root="true"]')).not.toHaveAttribute(
			'data-tauri-drag-region',
		)
		expect(screen.queryByText('StoneFlow')).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '打开历史记录' }).className).toContain(
			'rounded-full',
		)
		expect(screen.getByRole('button', { name: '打开历史记录' }).className).toContain(
			'size-[30px]',
		)
		expect(screen.getByRole('button', { name: '打开历史记录' }).className).toContain(
			'focus-visible:ring-0',
		)
		expect(screen.getByRole('button', { name: '后退' }).className).toContain('rounded-full')
		expect(screen.getByRole('button', { name: '前进' }).className).toContain('rounded-full')
		expect(screen.getByRole('img', { name: '当前用户头像' })).toHaveAttribute(
			'src',
			'/avatar.jpg',
		)
		expect(screen.getByRole('img', { name: '当前用户头像' }).className).toContain(
			'size-[30px]',
		)
		expect(screen.getByRole('button', { name: '打开设置' }).className).toContain('rounded-full')
		expect(screen.getByRole('button', { name: '后退' })).toBeDisabled()
		expect(screen.getByRole('button', { name: '前进' })).toBeDisabled()

		const closeButton = screen.getByRole('button', { name: '关闭窗口' })
		expect(screen.getByRole('button', { name: '最小化窗口' }).className).toContain('h-full w-11')
		expect(screen.getByRole('button', { name: '最大化窗口' }).className).toContain('h-full w-11')
		expect(closeButton.className).toContain('h-full w-11')
		expect(screen.getByRole('button', { name: '最小化窗口' }).className).toContain(
			'hover:bg-(--sf-color-shell-hover-strong)',
		)
		expect(screen.getByRole('button', { name: '最大化窗口' }).className).toContain(
			'hover:bg-(--sf-color-shell-hover-strong)',
		)
		expect(closeButton.className).toContain('hover:bg-[#E81123]')
		expect(
			document.querySelector('[aria-label="最小化窗口"]')?.parentElement?.querySelector('div')
				?.className,
		).toContain('bg-(--sf-color-border-strong)')

		fireEvent.click(screen.getByRole('button', { name: '最小化窗口' }))
		fireEvent.click(screen.getByRole('button', { name: '最大化窗口' }))
		fireEvent.click(closeButton)

		await waitFor(() => {
			expect(currentWindow.minimize).toHaveBeenCalledTimes(1)
			expect(currentWindow.toggleMaximize).toHaveBeenCalledTimes(1)
			expect(currentWindow.close).toHaveBeenCalledTimes(1)
		})
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

function renderHeader(overrides: Partial<ComponentProps<typeof ShellHeader>> = {}) {
	const props: ComponentProps<typeof ShellHeader> = {
		currentSpaceId: 'default',
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

	return render(
		<MemoryRouter initialEntries={['/space/default/inbox']}>
			<ShellHeader {...props} />
		</MemoryRouter>,
	)
}

function createMockWindow() {
	return {
		isMaximized: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
		minimize: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		toggleMaximize: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		close: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
	} as unknown as ReturnType<typeof getCurrentWindow>
}
