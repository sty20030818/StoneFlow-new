import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type PointerEvent as ReactPointerEvent,
	type RefObject,
} from 'react'

import { cn } from '@/shared/lib/utils'

type OverlayScrollbarProps<TElement extends HTMLElement = HTMLElement> = {
	scrollRef: RefObject<TElement | null>
	className?: string
	thumbClassName?: string
	idleThumbClassName?: string
	hoverThumbClassName?: string
	activeThumbClassName?: string
	minThumbHeight?: number
	thumbLengthRatio?: number
	trackInsetBottom?: number
	trackInsetTop?: number
}

type ScrollbarGeometry = {
	height: number
	top: number
	visible: boolean
}

export function OverlayScrollbar<TElement extends HTMLElement = HTMLElement>({
	scrollRef,
	className,
	thumbClassName,
	idleThumbClassName = 'bg-sf-border-secondary',
	hoverThumbClassName = 'bg-sf-border-strong',
	activeThumbClassName = 'bg-sf-text-primary',
	minThumbHeight = 24,
	thumbLengthRatio = 1,
	trackInsetBottom = 0,
	trackInsetTop = 0,
}: OverlayScrollbarProps<TElement>) {
	const [scrollbar, setScrollbar] = useState<ScrollbarGeometry>({
		height: 0,
		top: 0,
		visible: false,
	})
	const [isHoveringThumb, setIsHoveringThumb] = useState(false)
	const [isDragging, setIsDragging] = useState(false)
	const dragStateRef = useRef({ startScrollTop: 0, startY: 0 })

	const updateScrollbar = useCallback(() => {
		const scrollElement = scrollRef.current
		if (!scrollElement) {
			return
		}

		const { clientHeight, scrollHeight, scrollTop } = scrollElement
		const visible = scrollHeight > clientHeight + 1
		if (!visible) {
			setScrollbar((current) =>
				current.visible || current.height !== 0 || current.top !== 0
					? { height: 0, top: 0, visible: false }
					: current,
			)
			return
		}

		const trackHeight = Math.max(0, clientHeight - trackInsetTop - trackInsetBottom)
		const proportionalHeight = (clientHeight / scrollHeight) * trackHeight
		const height = Math.max(minThumbHeight, proportionalHeight * thumbLengthRatio)
		const maxTop = trackHeight - height
		const maxScrollTop = scrollHeight - clientHeight
		const top = maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxTop : 0

		setScrollbar((current) => {
			if (
				current.visible &&
				Math.abs(current.height - height) < 0.5 &&
				Math.abs(current.top - top) < 0.5
			) {
				return current
			}

			return { height, top, visible: true }
		})
	}, [minThumbHeight, scrollRef, thumbLengthRatio, trackInsetBottom, trackInsetTop])

	useEffect(() => {
		updateScrollbar()
	})

	useEffect(() => {
		const scrollElement = scrollRef.current
		if (!scrollElement) {
			return
		}

		scrollElement.addEventListener('scroll', updateScrollbar)
		return () => scrollElement.removeEventListener('scroll', updateScrollbar)
	}, [scrollRef, updateScrollbar])

	useEffect(() => {
		const scrollElement = scrollRef.current
		if (!scrollElement || typeof ResizeObserver === 'undefined') {
			return
		}

		const observer = new ResizeObserver(updateScrollbar)
		observer.observe(scrollElement)
		for (const child of Array.from(scrollElement.children)) {
			observer.observe(child)
		}

		return () => observer.disconnect()
	}, [scrollRef, updateScrollbar])

	const handleThumbPointerDown = useCallback(
		(event: ReactPointerEvent<HTMLDivElement>) => {
			const scrollElement = scrollRef.current
			if (!scrollElement) {
				return
			}

			event.preventDefault()
			event.stopPropagation()
			event.currentTarget.setPointerCapture(event.pointerId)
			setIsDragging(true)
			setIsHoveringThumb(true)
			dragStateRef.current = {
				startScrollTop: scrollElement.scrollTop,
				startY: event.clientY,
			}
		},
		[scrollRef],
	)

	useEffect(() => {
		if (!isDragging) {
			return
		}

		const handlePointerMove = (event: PointerEvent) => {
			const scrollElement = scrollRef.current
			if (!scrollElement) {
				return
			}

			const { clientHeight, scrollHeight } = scrollElement
			const maxScrollTop = scrollHeight - clientHeight
			const maxThumbTop = clientHeight - scrollbar.height
			if (maxScrollTop <= 0 || maxThumbTop <= 0) {
				return
			}

			const deltaY = event.clientY - dragStateRef.current.startY
			scrollElement.scrollTop =
				dragStateRef.current.startScrollTop + (deltaY / maxThumbTop) * maxScrollTop
			updateScrollbar()
		}

		const handlePointerUp = () => {
			setIsDragging(false)
		}

		window.addEventListener('pointermove', handlePointerMove)
		window.addEventListener('pointerup', handlePointerUp)
		window.addEventListener('pointercancel', handlePointerUp)

		return () => {
			window.removeEventListener('pointermove', handlePointerMove)
			window.removeEventListener('pointerup', handlePointerUp)
			window.removeEventListener('pointercancel', handlePointerUp)
		}
	}, [isDragging, scrollRef, scrollbar.height, updateScrollbar])

	if (!scrollbar.visible) {
		return null
	}

	return (
		<div
			aria-hidden='true'
			className={cn('pointer-events-none absolute right-0 z-1 w-2', className)}
			style={{ bottom: trackInsetBottom, top: trackInsetTop }}
		>
			<div
				className={cn(
					'pointer-events-auto absolute right-0 w-1.5 rounded-full transition-colors',
					isDragging
						? activeThumbClassName
						: isHoveringThumb
							? hoverThumbClassName
							: idleThumbClassName,
					thumbClassName,
				)}
				onPointerDown={handleThumbPointerDown}
				onPointerEnter={() => setIsHoveringThumb(true)}
				onPointerLeave={() => setIsHoveringThumb(false)}
				style={{ height: scrollbar.height, top: scrollbar.top }}
			/>
		</div>
	)
}
