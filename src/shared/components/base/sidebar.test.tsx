import * as React from 'react'
import { act, fireEvent, waitFor } from '@testing-library/react'

import {
	Sidebar,
	SidebarMenuButton,
	SidebarProvider,
	SidebarRail,
	SidebarTrigger,
} from '@/shared/components/base/sidebar'
import { DEFAULT_SIDEBAR_WIDTH } from '@/shared/lib/shellSidebarGeometry'
import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'

type MatchMediaController = {
	setMatches: (matches: boolean) => void
}

describe('Sidebar primitive', () => {
	it('desktop 初始态产出展开几何变量且只渲染 sidebar（无遮罩 DOM）', () => {
		installMatchMedia(true)
		renderSidebarFixture()

		const provider = getProvider()

		expect(provider).toHaveAttribute('data-sidebar-layout', 'desktop')
		expect(provider).toHaveAttribute('data-sidebar-mode', 'desktop-expanded')
		expect(provider.style.getPropertyValue('--sf-shell-sidebar-panel-width')).toBe(
			`${DEFAULT_SIDEBAR_WIDTH}px`,
		)
		expect(provider.style.getPropertyValue('--sf-shell-sidebar-panel-offset-x')).toBe('0px')
		expect(provider.style.getPropertyValue('--sf-shell-sidebar-reserved-width')).toBe(
			`${DEFAULT_SIDEBAR_WIDTH}px`,
		)
		expect(document.querySelectorAll('[data-slot="sidebar"]')).toHaveLength(1)
		expect(document.querySelectorAll('[data-slot="sidebar-overlay"]')).toHaveLength(0)
	})

	it('desktop 折叠后为 icon 宽且位移为 0（裁左侧图标列，而非 translate 露右缘）', () => {
		installMatchMedia(true)
		renderSidebarFixture()

		fireEvent.click(getTrigger())
		const provider = getProvider()
		expect(provider).toHaveAttribute('data-sidebar-mode', 'desktop-collapsed')
		expect(provider.style.getPropertyValue('--sf-shell-sidebar-panel-width').trim()).toBe('48px')
		expect(provider.style.getPropertyValue('--sf-shell-sidebar-panel-offset-x').trim()).toBe('0px')
		expect(provider.style.getPropertyValue('--sf-shell-sidebar-reserved-width').trim()).toBe('48px')
		expect(getRail().style.cursor).toContain('e-resize')
	})

	it('从 desktop 进入 mobile 时默认 closed，再回 desktop 恢复桌面偏好态', () => {
		const media = installMatchMedia(true)
		renderSidebarFixture()

		fireEvent.click(getTrigger())
		expect(getProvider()).toHaveAttribute('data-sidebar-mode', 'desktop-collapsed')

		act(() => media.setMatches(false))
		expect(getProvider()).toHaveAttribute('data-sidebar-layout', 'mobile')
		expect(getProvider()).toHaveAttribute('data-sidebar-mode', 'mobile-closed')
		expect(getProvider().style.getPropertyValue('--sf-shell-sidebar-reserved-width')).toBe('0px')

		act(() => media.setMatches(true))
		expect(getProvider()).toHaveAttribute('data-sidebar-layout', 'desktop')
		expect(getProvider()).toHaveAttribute('data-sidebar-mode', 'desktop-collapsed')
	})

	it('mobile 使用固定 220px 抽屉宽，不继承 desktop 当前可变宽', () => {
		const media = installMatchMedia(true)
		renderSidebarFixture({ sidebarWidth: 220 })

		expect(getProvider().style.getPropertyValue('--sf-shell-sidebar-panel-width')).toBe('220px')

		act(() => media.setMatches(false))

		expect(getProvider()).toHaveAttribute('data-sidebar-mode', 'mobile-closed')
		expect(getProvider().style.getPropertyValue('--sf-shell-sidebar-panel-width')).toBe('220px')
		expect(getProvider().style.getPropertyValue('--sf-shell-sidebar-panel-offset-x')).toBe(
			'calc(var(--sf-shell-sidebar-panel-width) * -1)',
		)
	})

	it('desktop icon 跨到 mobile-closed 时保持 compact 内容规则', () => {
		const media = installMatchMedia(true)
		renderSidebarFixture()

		fireEvent.click(getTrigger())
		act(() => media.setMatches(false))

		expect(getProvider()).toHaveAttribute('data-sidebar-mode', 'mobile-closed')
		expect(getProvider().style.getPropertyValue('--sf-shell-sidebar-panel-width')).toBe('48px')
		expect(getProvider().style.getPropertyValue('--sf-shell-sidebar-panel-offset-x')).toBe('-48px')
		expect(getMenuButton().className).toContain(
			'group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:[&>span:not([data-sidebar-keep])]:hidden',
		)
	})

	it('断点切换立即应用目标几何且不建立过渡状态机', () => {
		const media = installMatchMedia(true)
		renderSidebarFixture()

		act(() => media.setMatches(false))

		expect(getProvider()).toHaveAttribute('data-sidebar-layout', 'mobile')
		expect(getProvider()).toHaveAttribute('data-sidebar-mode', 'mobile-closed')
		expect(getProvider()).not.toHaveAttribute('data-sidebar-breakpoint-switching')
		expect(getSidebar().className).not.toContain('transition-')
		expect(getSidebar().style.transition).toBe('')
	})

	it('mobile trigger 切换同一份面板与遮罩', () => {
		installMatchMedia(false)
		renderSidebarFixture()

		expect(getProvider()).toHaveAttribute('data-sidebar-mode', 'mobile-closed')
		expect(getTrigger()).toHaveAccessibleName('展开侧边栏')
		expect(getSidebar().className).toContain(
			'group-data-[sidebar-layout=mobile]/sidebar-wrapper:z-70',
		)

		fireEvent.click(getTrigger())

		expect(getProvider()).toHaveAttribute('data-sidebar-mode', 'mobile-open')
		expect(getProvider().style.getPropertyValue('--sf-shell-sidebar-overlay-opacity')).toBe('1')
		expect(document.querySelectorAll('[data-slot="sidebar"]')).toHaveLength(1)
		expect(document.querySelectorAll('[data-slot="sidebar-overlay"]')).toHaveLength(1)
		expect(document.querySelector('[data-slot="sidebar-overlay"]')?.className).toContain('inset-0')
		expect(document.querySelector('[data-slot="sidebar-overlay"]')?.className).toContain('z-60')
		expect(getTrigger()).toHaveAccessibleName('收起侧边栏')
	})

	it('desktop rail resize 只在 pointerup 后提交宽度', async () => {
		installMatchMedia(true)
		const originalRequestAnimationFrame = window.requestAnimationFrame
		const originalCancelAnimationFrame = window.cancelAnimationFrame
		window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
			callback(0)
			return 1
		}) as typeof window.requestAnimationFrame
		window.cancelAnimationFrame = (() => undefined) as typeof window.cancelAnimationFrame

		Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
			configurable: true,
			value: () => true,
		})
		Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
			configurable: true,
			value: () => undefined,
		})
		Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
			configurable: true,
			value: () => undefined,
		})

		const onSidebarWidthCommit = vi.fn<(width: number) => void>()
		renderSidebarFixture({ onSidebarWidthCommit })
		const rail = document.querySelector('[data-slot="sidebar-rail"]') as HTMLElement

		fireEvent.pointerDown(rail, { clientX: 0, pointerId: 1 })
		expect(document.body.style.cursor).toBe('col-resize')
		fireEvent.pointerMove(rail, { clientX: 50, pointerId: 1 })

		expect(getProvider().style.getPropertyValue('--sf-shell-sidebar-panel-width')).toBe('306px')
		expect(onSidebarWidthCommit).not.toHaveBeenCalled()

		fireEvent.pointerUp(rail, { pointerId: 1 })
		expect(document.body.style.cursor).toBe('')

		await waitFor(() => {
			expect(onSidebarWidthCommit).toHaveBeenCalledWith(306)
		})

		window.requestAnimationFrame = originalRequestAnimationFrame
		window.cancelAnimationFrame = originalCancelAnimationFrame
	})
})

function renderSidebarFixture({
	desktopPreference = 'expanded',
	sidebarWidth = DEFAULT_SIDEBAR_WIDTH,
	onSidebarWidthCommit,
}: {
	desktopPreference?: 'expanded' | 'collapsed'
	sidebarWidth?: number
	onSidebarWidthCommit?: (width: number) => void
} = {}) {
	return render(
		<SidebarProviderHarness
			desktopPreference={desktopPreference}
			onSidebarWidthCommit={onSidebarWidthCommit}
			sidebarWidth={sidebarWidth}
		/>,
	)
}

function SidebarProviderHarness({
	desktopPreference: initialDesktopPreference,
	sidebarWidth: initialSidebarWidth,
	onSidebarWidthCommit,
}: {
	desktopPreference: 'expanded' | 'collapsed'
	sidebarWidth: number
	onSidebarWidthCommit?: (width: number) => void
}) {
	const [desktopPreference, setDesktopPreference] = React.useState(initialDesktopPreference)
	const [sidebarWidth, setSidebarWidth] = React.useState(initialSidebarWidth)

	return (
		<SidebarProvider
			desktopPreference={desktopPreference}
			onDesktopPreferenceChange={setDesktopPreference}
			onSidebarWidthCommit={(width) => {
				setSidebarWidth(width)
				onSidebarWidthCommit?.(width)
			}}
			sidebarWidth={sidebarWidth}
		>
			<Sidebar collapsible='icon'>
				<SidebarMenuButton>
					<span>sidebar content</span>
				</SidebarMenuButton>
				<SidebarRail />
			</Sidebar>
			<SidebarTrigger />
		</SidebarProvider>
	)
}

function getProvider() {
	const provider = document.querySelector('[data-slot="sidebar-provider"]')
	if (!(provider instanceof HTMLElement)) {
		throw new Error('缺少 sidebar provider')
	}
	return provider
}

function getTrigger() {
	const trigger = document.querySelector('[data-slot="sidebar-trigger"]')
	if (!(trigger instanceof HTMLButtonElement)) {
		throw new Error('缺少 sidebar trigger')
	}
	return trigger
}

function getMenuButton() {
	const button = document.querySelector('[data-slot="sidebar-menu-button"]')
	if (!(button instanceof HTMLElement)) {
		throw new Error('缺少 sidebar menu button')
	}
	return button
}

function getSidebar() {
	const sidebar = document.querySelector('[data-slot="sidebar"]')
	if (!(sidebar instanceof HTMLElement)) {
		throw new Error('缺少 sidebar')
	}
	return sidebar
}

function getRail() {
	const rail = document.querySelector('[data-slot="sidebar-rail"]')
	if (!(rail instanceof HTMLElement)) {
		throw new Error('缺少 sidebar rail')
	}
	return rail
}

function installMatchMedia(initialMatches: boolean): MatchMediaController {
	let matches = initialMatches
	const listeners = new Set<(event: MediaQueryListEvent) => void>()
	const mediaQueryList = {
		get matches() {
			return matches
		},
		media: '(min-width: 1024px)',
		onchange: null,
		addEventListener: (_type: 'change', listener: (event: MediaQueryListEvent) => void) => {
			listeners.add(listener)
		},
		removeEventListener: (_type: 'change', listener: (event: MediaQueryListEvent) => void) => {
			listeners.delete(listener)
		},
		addListener: (listener: (event: MediaQueryListEvent) => void) => {
			listeners.add(listener)
		},
		removeListener: (listener: (event: MediaQueryListEvent) => void) => {
			listeners.delete(listener)
		},
		dispatchEvent: () => false,
	}

	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: () => mediaQueryList,
	})

	return {
		setMatches: (nextMatches: boolean) => {
			matches = nextMatches
			const event = { matches } as MediaQueryListEvent
			listeners.forEach((listener) => listener(event))
		},
	}
}
