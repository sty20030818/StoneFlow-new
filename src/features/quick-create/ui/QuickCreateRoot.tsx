import { useCallback, useEffect, useRef, useState } from 'react'

import { resizeWindow } from '@/features/quick-create/api/quickCreate'
import { QuickCreateComposer } from '@/features/quick-create/ui/QuickCreateComposer'
import {
	QuickCreateActionBoard,
	type QuickCreateActionBoardMetrics,
} from '@/features/quick-create/ui/QuickCreateActionBoard'
import { QuickCreateFooter } from '@/features/quick-create/ui/QuickCreateFooter'
import { QuickCreateSurface } from '@/features/quick-create/ui/QuickCreateSurface'
import { useQuickCreate } from '@/features/quick-create/model/QuickCreateProvider'
import { cn } from '@/shared/lib/utils'

const QUICK_CREATE_MIN_WINDOW_HEIGHT = 292
const QUICK_CREATE_MAX_WINDOW_HEIGHT = 640
const QUICK_CREATE_RESIZE_THRESHOLD = 2

export function QuickCreateRoot() {
	const { derived, state } = useQuickCreate()
	const resizeFrameRef = useRef<number | null>(null)
	const lastAppliedHeightRef = useRef<number | null>(null)
	const composerRef = useRef<HTMLDivElement | null>(null)
	const toastRef = useRef<HTMLDivElement | null>(null)
	const footerRef = useRef<HTMLDivElement | null>(null)
	const [isScrollLocked, setIsScrollLocked] = useState(false)
	const [boardMetrics, setBoardMetrics] = useState<QuickCreateActionBoardMetrics>({
		contentHeight: 0,
	})

	const handleBoardMetricsChange = useCallback((metrics: QuickCreateActionBoardMetrics) => {
		setBoardMetrics((current) => (current.contentHeight === metrics.contentHeight ? current : metrics))
	}, [])

	useEffect(() => {
		if (state.isBootstrapping) {
			return
		}

		let disposed = false

		const syncWindowSize = async () => {
			const naturalHeight = calculateContentHeight({
				boardContentHeight: boardMetrics.contentHeight,
				composerHeight: composerRef.current?.getBoundingClientRect().height ?? 0,
				footerHeight: footerRef.current?.getBoundingClientRect().height ?? 0,
				toastHeight: toastRef.current?.getBoundingClientRect().height ?? 0,
			})
			const shouldLockScroll = naturalHeight > QUICK_CREATE_MAX_WINDOW_HEIGHT
			const targetHeight = clamp(naturalHeight, QUICK_CREATE_MIN_WINDOW_HEIGHT, QUICK_CREATE_MAX_WINDOW_HEIGHT)

			setIsScrollLocked((current) => (current === shouldLockScroll ? current : shouldLockScroll))

			if (
				lastAppliedHeightRef.current !== null &&
				Math.abs(lastAppliedHeightRef.current - targetHeight) < QUICK_CREATE_RESIZE_THRESHOLD
			) {
				return
			}

			lastAppliedHeightRef.current = targetHeight

			try {
				await resizeWindow(targetHeight)
				if (import.meta.env.DEV) {
					console.debug('[quick-create] resize window', {
						naturalHeight,
						targetHeight,
						boardMetrics,
						isScrollLocked: shouldLockScroll,
					})
				}
			} catch {
				// 浏览器预览和受限环境下允许静默失败。
			}
		}

		const scheduleSyncWindowSize = () => {
			if (resizeFrameRef.current !== null) {
				window.cancelAnimationFrame(resizeFrameRef.current)
			}

			resizeFrameRef.current = window.requestAnimationFrame(() => {
				resizeFrameRef.current = null
				if (disposed) {
					return
				}
				void syncWindowSize()
			})
		}

		scheduleSyncWindowSize()

		return () => {
			disposed = true
			if (resizeFrameRef.current !== null) {
				window.cancelAnimationFrame(resizeFrameRef.current)
				resizeFrameRef.current = null
			}
		}
	}, [
		boardMetrics,
		derived.continuousToastVisible,
		state.isAdvancedOpen,
	])

	if (state.isBootstrapping) {
		return <div className='flex h-full min-h-0 flex-1 bg-transparent' />
	}

	return (
		<div
			className={cn(
				'relative flex w-full min-h-0 bg-transparent',
				isScrollLocked ? 'h-full' : 'self-start',
			)}
		>
			<QuickCreateSurface isScrollLocked={isScrollLocked}>
				<div className='shrink-0' ref={composerRef}>
					<QuickCreateComposer />
				</div>
				{derived.continuousToastVisible ? (
					<div
						className='shrink-0 flex items-center gap-2 border-y border-sf-success-surface-border bg-sf-success-surface px-4 py-2 text-[11.5px] text-sf-success-surface-text'
						ref={toastRef}
					>
						<span className='rounded bg-background/65 px-1.5 py-0.5 font-mono text-[11px] font-semibold'>
							{state.continuousCreateCount}
						</span>
						<span>已连续创建 {state.continuousCreateCount} 条</span>
					</div>
				) : null}
				<QuickCreateActionBoard isScrollLocked={isScrollLocked} onMetricsChange={handleBoardMetricsChange} />
				<div className='shrink-0' ref={footerRef}>
					<QuickCreateFooter />
				</div>
			</QuickCreateSurface>
		</div>
	)
}

function calculateContentHeight({
	boardContentHeight,
	composerHeight,
	footerHeight,
	toastHeight,
}: {
	boardContentHeight: number
	composerHeight: number
	footerHeight: number
	toastHeight: number
}) {
	return Math.ceil(composerHeight + toastHeight + boardContentHeight + footerHeight)
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max)
}
