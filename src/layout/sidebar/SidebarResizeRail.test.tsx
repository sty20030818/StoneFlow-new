import { fireEvent, render, screen } from '@testing-library/react'

import { useShellSidebarController } from '@/layout/model/useShellSidebarController'
import { SidebarResizeRail } from './SidebarResizeRail'

describe('SidebarResizeRail', () => {
	beforeEach(() => {
		installDesktopMatchMedia()
		Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
			configurable: true,
			value: vi.fn(),
		})
		Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
			configurable: true,
			value: vi.fn(() => true),
		})
		Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
			configurable: true,
			value: vi.fn(),
		})
	})

	it('小于 4px 是 click，切换宽窄且不提交宽度拖动', () => {
		const onPreferencesCommit = vi.fn()
		renderRail(onPreferencesCommit)
		const rail = screen.getByRole('separator', { name: '调整或切换侧边栏' })

		fireEvent.pointerDown(rail, { button: 0, clientX: 100, pointerId: 1 })
		fireEvent.pointerMove(rail, { clientX: 103, pointerId: 1 })
		expect(rail).not.toHaveAttribute('data-resizing')
		fireEvent.pointerUp(rail, { clientX: 103, pointerId: 1 })

		expect(onPreferencesCommit).toHaveBeenCalledOnce()
		expect(onPreferencesCommit).toHaveBeenCalledWith({
			width: 256,
			desktopPreference: 'collapsed',
		})
	})

	it('达到 4px 后 pointer capture 拖动只更新 live width，pointerup 单次提交', () => {
		const onPreferencesCommit = vi.fn()
		renderRail(onPreferencesCommit)
		const rail = screen.getByRole('separator')

		fireEvent.pointerDown(rail, { button: 0, clientX: 100, pointerId: 2 })
		fireEvent.pointerMove(rail, { clientX: 104, pointerId: 2 })

		expect(rail).toHaveAttribute('data-resizing', 'true')
		expect(rail).toHaveAttribute('aria-valuenow', '260')
		expect(onPreferencesCommit).not.toHaveBeenCalled()

		fireEvent.pointerUp(rail, { clientX: 104, pointerId: 2 })
		expect(rail).not.toHaveAttribute('data-resizing')
		expect(onPreferencesCommit).toHaveBeenCalledOnce()
		expect(onPreferencesCommit).toHaveBeenCalledWith({
			width: 260,
			desktopPreference: 'expanded',
		})
		expect(document.body.style.cursor).toBe('')
	})

	it('collapsed drag 先恢复展开宽度，cancel 回滚且不持久化', () => {
		const onPreferencesCommit = vi.fn()
		renderRail(onPreferencesCommit, 'collapsed')
		const rail = screen.getByRole('separator')

		expect(rail).toHaveAttribute('aria-valuetext', '侧边栏已收起；展开宽度 256 像素')
		fireEvent.pointerDown(rail, { button: 0, clientX: 50, pointerId: 3 })
		fireEvent.pointerMove(rail, { clientX: 74, pointerId: 3 })

		expect(rail).toHaveAttribute('data-sidebar-mode', 'expanded')
		expect(rail).toHaveAttribute('aria-valuenow', '280')

		fireEvent.pointerCancel(rail, { pointerId: 3 })
		expect(rail).toHaveAttribute('data-sidebar-mode', 'icon')
		expect(rail).toHaveAttribute('aria-valuenow', '256')
		expect(onPreferencesCommit).not.toHaveBeenCalled()
	})

	it('拖动中卸载会清理系统光标并回滚 live width', () => {
		const onPreferencesCommit = vi.fn()
		const view = renderRail(onPreferencesCommit)
		const rail = screen.getByRole('separator')

		fireEvent.pointerDown(rail, { button: 0, clientX: 50, pointerId: 4 })
		fireEvent.pointerMove(rail, { clientX: 60, pointerId: 4 })
		expect(document.body.style.cursor).toBe('col-resize')

		view.unmount()
		expect(document.body.style.cursor).toBe('')
		expect(onPreferencesCommit).not.toHaveBeenCalled()
	})

	it('键盘提供 toggle、8/24px 调宽和 Home/End，并暴露宽度状态', () => {
		const onPreferencesCommit = vi.fn()
		renderRail(onPreferencesCommit, 'collapsed')
		const rail = screen.getByRole('separator')

		fireEvent.keyDown(rail, { key: 'Enter' })
		expect(onPreferencesCommit).toHaveBeenLastCalledWith({
			width: 256,
			desktopPreference: 'expanded',
		})

		fireEvent.keyDown(rail, { key: 'ArrowRight' })
		expect(rail).toHaveAttribute('aria-valuenow', '264')
		fireEvent.keyDown(rail, { key: 'ArrowLeft', shiftKey: true })
		expect(rail).toHaveAttribute('aria-valuenow', '240')
		fireEvent.keyDown(rail, { key: 'Home' })
		expect(rail).toHaveAttribute('aria-valuenow', '220')
		fireEvent.keyDown(rail, { key: 'End' })
		expect(rail).toHaveAttribute('aria-valuenow', '330')
		expect(rail).toHaveAttribute('aria-valuetext', '侧边栏已展开；宽度 330 像素')
		expect(onPreferencesCommit).toHaveBeenCalledTimes(5)
	})
})

function renderRail(
	onPreferencesCommit: (preferences: {
		width: number
		desktopPreference: 'expanded' | 'collapsed'
	}) => void,
	desktopPreference: 'expanded' | 'collapsed' = 'expanded',
) {
	function Fixture() {
		const controller = useShellSidebarController({
			initialPreferences: { width: 256, desktopPreference },
			onPreferencesCommit,
		})
		return <SidebarResizeRail controller={controller} />
	}

	return render(<Fixture />)
}

function installDesktopMatchMedia() {
	const mediaQuery = {
		matches: true,
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
