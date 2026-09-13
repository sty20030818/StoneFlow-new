/**
 * Board 分区 sticky 顶替：列表提交时同步标题，scroll 帧更新同组推挤。
 * 换分区时禁止先把旧标题 transform 置 0（会闪）。
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { buildTaskBoardStickyPush } from '@/features/task/model/taskBoardModel'
import { useLatestRef } from '@/shared/lib/useLatestRef'

type StickyMeta = {
	stickyIndexes: readonly number[]
	itemOffsets: readonly number[]
}

export function useTaskBoardSticky({
	scrollViewport,
	stickyIndexes,
	itemOffsets,
	enabled,
}: {
	scrollViewport: HTMLElement | null | undefined
	stickyIndexes: readonly number[]
	itemOffsets: readonly number[]
	/** 列表 ready 后才绑 scroll */
	enabled: boolean
}) {
	const stickyMetaRef = useLatestRef<StickyMeta>({ stickyIndexes, itemOffsets })

	const stickyShellRef = useRef<HTMLDivElement | null>(null)
	const stickyPushLayerRef = useRef<HTMLDivElement | null>(null)
	const stickyActiveIndexRef = useRef(0)
	const stickyRenderedIndexRef = useRef(0)
	const stickyStuckRef = useRef(false)
	const [stickyActiveIndex, setStickyActiveIndex] = useState(0)
	const [stickyStuck, setStickyStuck] = useState(false)

	const reconcileSticky = useCallback(() => {
		if (!enabled) return
		const layout = buildTaskBoardStickyPush({
			stickyIndexes: stickyMetaRef.current.stickyIndexes,
			itemOffsets: stickyMetaRef.current.itemOffsets,
			scrollTop: scrollViewport?.scrollTop ?? 0,
		})
		if (!layout) return
		if (layout.activeStickyIndex !== stickyActiveIndexRef.current) {
			stickyActiveIndexRef.current = layout.activeStickyIndex
			setStickyActiveIndex(layout.activeStickyIndex)
		}
		if (layout.stuck !== stickyStuckRef.current) {
			stickyStuckRef.current = layout.stuck
			setStickyStuck(layout.stuck)
		}
		const layer = stickyPushLayerRef.current
		if (layer && layout.activeStickyIndex === stickyRenderedIndexRef.current) {
			layer.style.transform = `translate3d(0, ${layout.pushOffset}px, 0)`
		}
		const shell = stickyShellRef.current
		if (shell) {
			shell.style.visibility = layout.stuck ? 'visible' : 'hidden'
			shell.style.pointerEvents = layout.stuck ? 'auto' : 'none'
		}
	}, [enabled, scrollViewport, stickyMetaRef])

	useLayoutEffect(() => {
		stickyRenderedIndexRef.current = stickyActiveIndex
		// 虚拟行可先于 scroll RAF 同步提交；此时标题必须按同一 viewport 校正。
		reconcileSticky()
	})

	useEffect(() => {
		const scrollEl = scrollViewport
		if (!enabled || !scrollEl) return
		let raf = 0
		const apply = () => {
			raf = 0
			reconcileSticky()
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
	}, [enabled, scrollViewport, reconcileSticky])

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
