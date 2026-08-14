import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react'

import type { ShellSidebarController } from '@/layout/model/useShellSidebarController'
import { SIDEBAR_WIDTH_MAX, SIDEBAR_WIDTH_MIN } from '@/shared/lib/shellSidebarGeometry'

type SidebarResizeRailProps = {
	controller: ShellSidebarController
}

const DRAG_THRESHOLD_PX = 4
const KEYBOARD_STEP_PX = 8
const KEYBOARD_LARGE_STEP_PX = 24

type PointerGesture = {
	pointerId: number
	startX: number
	startWidth: number
	lastWidth: number
	dragging: boolean
}

/** StoneFlow Shell 唯一的 click / drag / keyboard Sidebar separator。 */
export function SidebarResizeRail({ controller }: SidebarResizeRailProps) {
	const gestureRef = useRef<PointerGesture | null>(null)
	useEffect(
		() => () => {
			document.body.style.cursor = ''
		},
		[],
	)

	if (controller.mode === 'compact') {
		return null
	}

	const releasePointer = (event: PointerEvent<HTMLDivElement>) => {
		if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId)
		}
		document.body.style.cursor = ''
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()
			controller.toggleSidebar()
			return
		}

		const step = event.shiftKey ? KEYBOARD_LARGE_STEP_PX : KEYBOARD_STEP_PX
		let nextWidth: number | null = null
		switch (event.key) {
			case 'ArrowLeft':
				nextWidth = controller.committedWidth - step
				break
			case 'ArrowRight':
				nextWidth = controller.committedWidth + step
				break
			case 'Home':
				nextWidth = SIDEBAR_WIDTH_MIN
				break
			case 'End':
				nextWidth = SIDEBAR_WIDTH_MAX
				break
			default:
				return
		}

		event.preventDefault()
		controller.commitKeyboardWidth(nextWidth)
	}

	const valueText =
		controller.mode === 'icon'
			? `侧边栏已收起；展开宽度 ${controller.liveWidth} 像素`
			: `侧边栏已展开；宽度 ${controller.liveWidth} 像素`

	return (
		<div
			aria-label='调整或切换侧边栏'
			aria-orientation='vertical'
			aria-valuemax={SIDEBAR_WIDTH_MAX}
			aria-valuemin={SIDEBAR_WIDTH_MIN}
			aria-valuenow={controller.liveWidth}
			aria-valuetext={valueText}
			className='group absolute inset-y-0 -right-2 z-20 w-4 touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-focus'
			data-resizing={controller.isResizing ? 'true' : undefined}
			data-sidebar-mode={controller.mode}
			data-slot='sidebar-resize-rail'
			onKeyDown={handleKeyDown}
			onPointerCancel={(event) => {
				const gesture = gestureRef.current
				if (!gesture || gesture.pointerId !== event.pointerId) {
					return
				}
				if (gesture.dragging) {
					controller.cancelResize()
				}
				gestureRef.current = null
				releasePointer(event)
			}}
			onPointerDown={(event) => {
				if (event.button !== 0) {
					return
				}
				gestureRef.current = {
					pointerId: event.pointerId,
					startX: event.clientX,
					startWidth: controller.committedWidth,
					lastWidth: controller.committedWidth,
					dragging: false,
				}
				event.currentTarget.setPointerCapture?.(event.pointerId)
			}}
			onPointerMove={(event) => {
				const gesture = gestureRef.current
				if (!gesture || gesture.pointerId !== event.pointerId) {
					return
				}

				const delta = event.clientX - gesture.startX
				if (!gesture.dragging && Math.abs(delta) < DRAG_THRESHOLD_PX) {
					return
				}
				if (!gesture.dragging) {
					gesture.dragging = true
					controller.beginResize()
					document.body.style.cursor = 'col-resize'
				}

				gesture.lastWidth = gesture.startWidth + delta
				controller.resizeTo(gesture.lastWidth)
			}}
			onPointerUp={(event) => {
				const gesture = gestureRef.current
				if (!gesture || gesture.pointerId !== event.pointerId) {
					return
				}

				if (gesture.dragging) {
					controller.commitResize(gesture.lastWidth)
				} else {
					controller.toggleSidebar()
				}
				gestureRef.current = null
				releasePointer(event)
			}}
			role='separator'
			style={{ cursor: controller.mode === 'icon' ? 'e-resize' : 'col-resize' }}
			tabIndex={0}
		>
			<span
				aria-hidden='true'
				className='pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent group-hover:bg-border'
			/>
		</div>
	)
}
