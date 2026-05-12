import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { presentWindow, resizeWindow } from '@/features/quick-create/api/quickCreate'
import { useQuickCreate } from '@/features/quick-create/model/QuickCreateProvider'
import {
	QuickCreateActionBoard,
	type QuickCreateActionBoardMetrics,
} from '@/features/quick-create/ui/QuickCreateActionBoard'
import { QuickCreateComposer } from '@/features/quick-create/ui/QuickCreateComposer'
import { QuickCreateFooter } from '@/features/quick-create/ui/QuickCreateFooter'
import { QuickCreateSurface } from '@/features/quick-create/ui/QuickCreateSurface'

const QUICK_CREATE_MIN_WINDOW_HEIGHT = 364
const QUICK_CREATE_RESIZE_THRESHOLD = 2
const QUICK_CREATE_SHADOW_PADDING_PX = 36

export function QuickCreateRoot() {
	const { derived, state } = useQuickCreate()
	const [isSurfaceReady, setSurfaceReady] = useState(false)
	const [hasBoardMetrics, setHasBoardMetrics] = useState(false)
	const lastAppliedHeightRef = useRef<number | null>(null)
	const presentationSentRef = useRef(false)
	const lastLayoutVersionRef = useRef<number>(state.layoutVersion)
	const composerRef = useRef<HTMLDivElement | null>(null)
	const toastRef = useRef<HTMLDivElement | null>(null)
	const footerRef = useRef<HTMLDivElement | null>(null)
	const [boardMetrics, setBoardMetrics] = useState<QuickCreateActionBoardMetrics>({
		contentHeight: 0,
	})

	const handleBoardMetricsChange = useCallback((metrics: QuickCreateActionBoardMetrics) => {
		setBoardMetrics((current) =>
			current.contentHeight === metrics.contentHeight ? current : metrics,
		)
		setHasBoardMetrics(true)
	}, [])

	useLayoutEffect(() => {
		if (lastLayoutVersionRef.current !== state.layoutVersion) {
			lastLayoutVersionRef.current = state.layoutVersion
			lastAppliedHeightRef.current = null
			presentationSentRef.current = false
			setHasBoardMetrics(false)
			setSurfaceReady(false)
		}

		if (state.isBootstrapping || !hasBoardMetrics) {
			setSurfaceReady(false)
			return
		}

		let disposed = false

		const syncWindowSize = async () => {
			const composerHeight = composerRef.current?.getBoundingClientRect().height ?? 0
			const toastHeight = toastRef.current?.getBoundingClientRect().height ?? 0
			const footerHeight = footerRef.current?.getBoundingClientRect().height ?? 0
			const naturalHeight = Math.ceil(
				composerHeight +
					toastHeight +
					boardMetrics.contentHeight +
					footerHeight +
					QUICK_CREATE_SHADOW_PADDING_PX * 2,
			)
			const targetHeight = Math.max(naturalHeight, QUICK_CREATE_MIN_WINDOW_HEIGHT)

			if (
				lastAppliedHeightRef.current !== null &&
				Math.abs(lastAppliedHeightRef.current - targetHeight) < QUICK_CREATE_RESIZE_THRESHOLD
			) {
				return
			}

			lastAppliedHeightRef.current = targetHeight

			try {
				await resizeWindow(targetHeight)
			} catch {
				// 预览环境或受限平台允许静默失败。
			} finally {
				if (!disposed) {
					setSurfaceReady(true)
				}
			}
		}

		void syncWindowSize()

		return () => {
			disposed = true
		}
	}, [
		boardMetrics.contentHeight,
		derived.continuousToastVisible,
		derived.displayProjects.length,
		derived.displayTasks.length,
		derived.isSearchEmpty,
		derived.isShowingRecent,
		state.layoutVersion,
		state.draft.title,
		state.isAdvancedOpen,
		state.isBootstrapping,
		hasBoardMetrics,
	])

	useEffect(() => {
		if (!state.isPresentationPending || !isSurfaceReady || presentationSentRef.current) {
			return
		}

		presentationSentRef.current = true
		void presentWindow().catch(() => {
			presentationSentRef.current = false
		})
	}, [isSurfaceReady, state.isPresentationPending])

	if (state.isBootstrapping) {
		return <div className='flex h-full min-h-0 flex-1 bg-transparent' />
	}

	return (
		<div className='relative flex w-full min-h-0 bg-transparent'>
			<QuickCreateSurface
				className={`w-full transition-opacity duration-150 ${
					isSurfaceReady ? 'opacity-100' : 'pointer-events-none opacity-0'
				}`}
			>
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
				<QuickCreateActionBoard
					key={state.layoutVersion}
					onMetricsChange={handleBoardMetricsChange}
				/>
				<div className='shrink-0' ref={footerRef}>
					<QuickCreateFooter />
				</div>
			</QuickCreateSurface>
		</div>
	)
}
