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

/**
 * 自定义覆盖滚动条（纯视觉层）。
 *
 * 最佳实践：
 * - 拇指几何只读原生 scrollTop / scrollHeight / clientHeight，不另造 extent
 * - 滚动帧只写 DOM（transform/height），不 setState，避免重渲抹掉位移
 * - 列表要「拇指恒定」，应锁内容 DOM 高度，而不是在滚动条里伪造总高
 */
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
	const [visible, setVisible] = useState(false)
	const [isHoveringThumb, setIsHoveringThumb] = useState(false)
	const [isDragging, setIsDragging] = useState(false)
	const dragStateRef = useRef({ startScrollTop: 0, startY: 0, maxThumbTop: 0, maxScrollTop: 0 })
	const rafRef = useRef(0)
	const thumbRef = useRef<HTMLDivElement>(null)
	const lastVisibleRef = useRef(false)
	const lastHeightRef = useRef(0)
	const metricsRef = useRef({ maxThumbTop: 0, maxScrollTop: 0 })

	const applyGeometry = useCallback(() => {
		const scrollElement = scrollRef.current
		const thumb = thumbRef.current
		if (!scrollElement || !thumb) {
			return
		}

		// 唯一坐标系：原生 scrollTop / scrollHeight / clientHeight。
		// 拇指长短不匀 = 内容 scrollHeight 在变，应锁列表 DOM 总高，而不是在这里伪造。
		const { clientHeight, scrollHeight, scrollTop } = scrollElement
		const maxScrollTop = Math.max(scrollHeight - clientHeight, 0)
		const nextVisible = maxScrollTop > 1

		if (!nextVisible) {
			if (lastVisibleRef.current) {
				lastVisibleRef.current = false
				setVisible(false)
			}
			return
		}

		const trackHeight = Math.max(0, clientHeight - trackInsetTop - trackInsetBottom)
		const proportionalHeight = (clientHeight / Math.max(scrollHeight, 1)) * trackHeight
		const height = Math.max(minThumbHeight, proportionalHeight * thumbLengthRatio)
		const maxThumbTop = Math.max(0, trackHeight - height)
		const clampedScrollTop = Math.min(Math.max(scrollTop, 0), maxScrollTop)
		const top = maxScrollTop > 0 ? (clampedScrollTop / maxScrollTop) * maxThumbTop : 0

		metricsRef.current = { maxThumbTop, maxScrollTop }

		// 几何只走 DOM；不把 height/transform 放进 React style（className 重渲会抹掉 transform）
		if (Math.abs(lastHeightRef.current - height) >= 0.5) {
			lastHeightRef.current = height
			thumb.style.height = `${height}px`
		}
		thumb.style.transform = `translate3d(0, ${top}px, 0)`

		if (!lastVisibleRef.current) {
			lastVisibleRef.current = true
			setVisible(true)
		}
	}, [minThumbHeight, scrollRef, thumbLengthRatio, trackInsetBottom, trackInsetTop])

	const scheduleApply = useCallback(() => {
		if (rafRef.current !== 0) {
			return
		}
		rafRef.current = requestAnimationFrame(() => {
			rafRef.current = 0
			applyGeometry()
		})
	}, [applyGeometry])

	useEffect(() => {
		const scrollElement = scrollRef.current
		if (!scrollElement) {
			return
		}

		scheduleApply()
		scrollElement.addEventListener('scroll', scheduleApply, { passive: true })
		return () => {
			scrollElement.removeEventListener('scroll', scheduleApply)
			if (rafRef.current !== 0) {
				cancelAnimationFrame(rafRef.current)
				rafRef.current = 0
			}
		}
	}, [scheduleApply, scrollRef])

	useEffect(() => {
		const scrollElement = scrollRef.current
		if (!scrollElement || typeof ResizeObserver === 'undefined') {
			return
		}

		/**
		 * 拇指长度依赖 scrollHeight，而 scrollHeight 变化时 viewport 的 border box
		 * 往往不变（折叠分区、换列表）→ 只 observe viewport 不会触发。
		 *
		 * 观察：
		 * 1. viewport（clientHeight 变化）
		 * 2. 直接子节点（常见内容根）
		 * 3. [data-scroll-extent]（虚拟列表等显式定高的内容根；折叠改 height 会触发 RO）
		 *
		 * 不 observe 全子树 style：虚拟行每帧改 transform 会刷爆。
		 */
		const observer = new ResizeObserver(scheduleApply)
		const syncObserved = () => {
			observer.observe(scrollElement)
			for (const child of scrollElement.children) {
				observer.observe(child)
			}
			for (const node of scrollElement.querySelectorAll('[data-scroll-extent]')) {
				observer.observe(node)
			}
		}
		syncObserved()
		scheduleApply()

		const isExtentRelated = (node: Node) =>
			node instanceof Element &&
			(node.hasAttribute('data-scroll-extent') ||
				Boolean(node.querySelector?.('[data-scroll-extent]')))

		// 只关心：内容根挂载 / data-scroll-extent 变化。
		// 不因虚拟行 childList 刷 scheduleApply（滚动时每帧挂卸载行）。
		const mutationObserver = new MutationObserver((records) => {
			let needResync = false
			let needApply = false
			for (const record of records) {
				if (record.type === 'attributes' && record.attributeName === 'data-scroll-extent') {
					needResync = true
					needApply = true
					continue
				}
				if (record.type !== 'childList') {
					continue
				}
				if (record.target === scrollElement) {
					needResync = true
					needApply = true
					continue
				}
				for (const node of record.addedNodes) {
					if (isExtentRelated(node)) {
						needResync = true
						needApply = true
						break
					}
				}
			}
			if (needResync) {
				syncObserved()
			}
			if (needApply) {
				scheduleApply()
			}
		})
		mutationObserver.observe(scrollElement, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['data-scroll-extent'],
		})

		return () => {
			observer.disconnect()
			mutationObserver.disconnect()
		}
	}, [scheduleApply, scrollRef])

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
			const { maxThumbTop, maxScrollTop } = metricsRef.current
			dragStateRef.current = {
				startScrollTop: scrollElement.scrollTop,
				startY: event.clientY,
				maxThumbTop,
				maxScrollTop,
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

			const { maxThumbTop, maxScrollTop, startScrollTop, startY } = dragStateRef.current
			if (maxScrollTop <= 0 || maxThumbTop <= 0) {
				return
			}

			const deltaY = event.clientY - startY
			scrollElement.scrollTop = startScrollTop + (deltaY / maxThumbTop) * maxScrollTop
			scheduleApply()
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
	}, [isDragging, scheduleApply, scrollRef])

	return (
		<div
			aria-hidden='true'
			className={cn(
				'pointer-events-none absolute right-0 z-1 w-2',
				!visible && 'invisible',
				className,
			)}
			style={{ bottom: trackInsetBottom, top: trackInsetTop }}
		>
			<div
				ref={thumbRef}
				className={cn(
					'pointer-events-auto absolute right-0 top-0 w-1.5 rounded-full will-change-transform',
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
			/>
		</div>
	)
}
