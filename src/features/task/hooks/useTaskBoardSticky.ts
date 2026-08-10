/**
 * Board 分区 sticky 顶替：scroll 帧写 DOM；index 变才 setState。
 * 换分区时禁止先把旧标题 transform 置 0（会闪）。
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

import { buildTaskBoardStickyPush } from '@/features/task/model/taskBoardModel'

type StickyMeta = {
	stickyIndexes: readonly number[]
	itemOffsets: readonly number[]
}

export function useTaskBoardSticky({
	scrollViewportRef,
	stickyIndexes,
	itemOffsets,
	enabled,
}: {
	scrollViewportRef: RefObject<HTMLElement | null> | null | undefined
	stickyIndexes: readonly number[]
	itemOffsets: readonly number[]
	/** 列表 ready 后才绑 scroll */
	enabled: boolean
}) {
	const stickyMetaRef = useRef<StickyMeta>({ stickyIndexes: [], itemOffsets: [] })
	stickyMetaRef.current = { stickyIndexes, itemOffsets }

	const stickyShellRef = useRef<HTMLDivElement | null>(null)
	const stickyPushLayerRef = useRef<HTMLDivElement | null>(null)
	const stickyActiveIndexRef = useRef(0)
	const stickyRenderedIndexRef = useRef(0)
	const stickyStuckRef = useRef(false)
	const [stickyActiveIndex, setStickyActiveIndex] = useState(0)
	const [stickyStuck, setStickyStuck] = useState(true)

	const applyStickyDom = useCallback((scrollTop: number, forceTransform = false) => {
		const layout = buildTaskBoardStickyPush({
			stickyIndexes: stickyMetaRef.current.stickyIndexes,
			itemOffsets: stickyMetaRef.current.itemOffsets,
			scrollTop,
		})
		if (!layout) {
			return null
		}
		const contentReady =
			forceTransform || layout.activeStickyIndex === stickyRenderedIndexRef.current
		const layer = stickyPushLayerRef.current
		if (layer && contentReady) {
			layer.style.transform = `translate3d(0, ${layout.pushOffset}px, 0)`
		}
		const shell = stickyShellRef.current
		if (shell) {
			shell.style.visibility = layout.stuck ? 'visible' : 'hidden'
			shell.style.pointerEvents = layout.stuck ? 'auto' : 'none'
		}
		return layout
	}, [])

	useEffect(() => {
		if (!enabled) {
			return
		}
		const scrollEl = scrollViewportRef?.current
		const readTop = () => scrollEl?.scrollTop ?? 0
		let raf = 0
		const apply = () => {
			raf = 0
			const scrollTop = readTop()
			const layout = buildTaskBoardStickyPush({
				stickyIndexes: stickyMetaRef.current.stickyIndexes,
				itemOffsets: stickyMetaRef.current.itemOffsets,
				scrollTop,
			})
			if (!layout) {
				return
			}
			const indexChanged = layout.activeStickyIndex !== stickyActiveIndexRef.current
			if (indexChanged) {
				stickyActiveIndexRef.current = layout.activeStickyIndex
				setStickyActiveIndex(layout.activeStickyIndex)
			} else {
				applyStickyDom(scrollTop, false)
			}
			if (layout.stuck !== stickyStuckRef.current) {
				stickyStuckRef.current = layout.stuck
				setStickyStuck(layout.stuck)
				const shell = stickyShellRef.current
				if (shell) {
					shell.style.visibility = layout.stuck ? 'visible' : 'hidden'
					shell.style.pointerEvents = layout.stuck ? 'auto' : 'none'
				}
			}
		}
		apply()
		if (!scrollEl) {
			return
		}
		const onScroll = () => {
			if (raf !== 0) return
			raf = requestAnimationFrame(apply)
		}
		scrollEl.addEventListener('scroll', onScroll, { passive: true })
		return () => {
			scrollEl.removeEventListener('scroll', onScroll)
			if (raf !== 0) cancelAnimationFrame(raf)
		}
	}, [applyStickyDom, enabled, scrollViewportRef, stickyIndexes, itemOffsets])

	const stickyHeaderKey = stickyIndexes.length > 0 ? `sticky:${stickyActiveIndex}` : 'sticky:none'

	useLayoutEffect(() => {
		stickyRenderedIndexRef.current = stickyActiveIndex
		const scrollTop = scrollViewportRef?.current?.scrollTop ?? 0
		applyStickyDom(scrollTop, true)
	}, [applyStickyDom, stickyActiveIndex, stickyStuck, stickyHeaderKey, scrollViewportRef])

	const nextStickyIndex = (() => {
		const pos = stickyIndexes.indexOf(stickyActiveIndex)
		return pos >= 0 && pos < stickyIndexes.length - 1 ? stickyIndexes[pos + 1]! : null
	})()

	return {
		stickyShellRef,
		stickyPushLayerRef,
		stickyActiveIndex,
		stickyStuck,
		nextStickyIndex,
	}
}
