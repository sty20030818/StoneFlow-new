import type { ReactNode } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SearchIcon } from 'lucide-react'

import { presentWindow, resizeWindow } from '@/features/quick-create/api/quickCreate'
import { useQuickCreate } from '@/features/quick-create/model/QuickCreateProvider'
import { QuickCreateComposer } from '@/features/quick-create/ui/QuickCreateComposer'
import { QuickCreateFooter } from '@/features/quick-create/ui/QuickCreateFooter'
import { QuickCreateSurface } from '@/features/quick-create/ui/QuickCreateSurface'
import { QuickCreateCreateRowAdapter } from '@/features/quick-create/ui/adapters/QuickCreateCreateRowAdapter'
import { QuickCreateProjectResultRowAdapter } from '@/features/quick-create/ui/adapters/QuickCreateProjectResultRowAdapter'
import { QuickCreateTaskResultRowAdapter } from '@/features/quick-create/ui/adapters/QuickCreateTaskResultRowAdapter'
import { BoardEmptyState, BoardGroupHeader, BoardRows } from '@/shared/ui/board'

const QUICK_CREATE_MIN_WINDOW_HEIGHT = 364
const QUICK_CREATE_RESIZE_THRESHOLD = 2
const QUICK_CREATE_SHADOW_PADDING_PX = 36

export function QuickCreateRoot() {
	const { derived, state } = useQuickCreate()
	const [isSurfaceReady, setSurfaceReady] = useState(false)
	const lastAppliedHeightRef = useRef<number | null>(null)
	const presentationSentRef = useRef(false)
	const lastLayoutVersionRef = useRef<number>(state.layoutVersion)
	const topChromeRef = useRef<HTMLDivElement | null>(null)
	const boardStackRef = useRef<HTMLDivElement | null>(null)
	const footerRef = useRef<HTMLDivElement | null>(null)

	useLayoutEffect(() => {
		if (lastLayoutVersionRef.current !== state.layoutVersion) {
			lastLayoutVersionRef.current = state.layoutVersion
			lastAppliedHeightRef.current = null
			presentationSentRef.current = false
			setSurfaceReady(false)
		}

		if (state.isBootstrapping) {
			setSurfaceReady(false)
			return
		}

		let disposed = false

		const syncWindowSize = async () => {
			const chromeHeight = topChromeRef.current?.getBoundingClientRect().height ?? 0
			const boardHeight = boardStackRef.current?.getBoundingClientRect().height ?? 0
			const footerHeight = footerRef.current?.getBoundingClientRect().height ?? 0
			const naturalHeight = Math.ceil(
				chromeHeight + footerHeight + boardHeight + QUICK_CREATE_SHADOW_PADDING_PX * 2,
			)
			const targetHeight = Math.max(naturalHeight, QUICK_CREATE_MIN_WINDOW_HEIGHT)

			if (
				lastAppliedHeightRef.current !== null &&
				Math.abs(lastAppliedHeightRef.current - targetHeight) < QUICK_CREATE_RESIZE_THRESHOLD
			) {
				return
			}

			lastAppliedHeightRef.current = targetHeight

			logQuickCreateResize({
				chromeHeight,
				boardHeight,
				footerHeight,
				targetHeight,
			})

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
		derived.continuousToastVisible,
		derived.displayProjects.length,
		derived.displayTasks.length,
		derived.isSearchEmpty,
		derived.isShowingRecent,
		state.layoutVersion,
		state.draft.title,
		state.isAdvancedOpen,
		state.isBootstrapping,
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
				<div className='flex flex-col'>
					<div
						className='shrink-0 border-b border-sf-border-subtle/80 px-4 pb-3 pt-4'
						ref={topChromeRef}
					>
						<QuickCreateComposer />
						<div className='mt-3 rounded-2xl border border-sf-border-subtle bg-muted/35 px-2 py-2'>
							<div className='mb-2 flex items-center justify-between px-2 text-[11px] font-medium text-sf-text-tertiary'>
								<span>创建栏</span>
								<span>
									{derived.enterLabel === '打开' ? '优先创建，结果可直接打开' : '回车创建'}
								</span>
							</div>
							<BoardRows>
								<QuickCreateCreateRowAdapter />
							</BoardRows>
							<div className='mt-2 px-2 text-[11px] text-sf-text-quaternary'>
								{derived.createMeta}
							</div>
						</div>
					</div>

					<div
						className='flex flex-col gap-2 px-4 pb-3 pt-3'
						data-testid='quick-create-action-board'
						ref={boardStackRef}
					>
						{derived.isSearchEmpty ? (
							<div className='rounded-2xl border border-sf-border-subtle bg-background/96 px-4 py-6'>
								<BoardEmptyState
									icon={<SearchIcon className='size-4' />}
									title='没有匹配结果'
									description={`按 Enter 创建“${state.draft.title.trim()}”`}
									emptyClassName='min-h-32'
								/>
							</div>
						) : (
							<>
								<QuickCreateTaskBoard />
								<QuickCreateProjectBoard />
							</>
						)}
					</div>

					<div className='shrink-0 border-t border-sf-border-subtle/80' ref={footerRef}>
						<QuickCreateFooter />
					</div>
				</div>
			</QuickCreateSurface>
		</div>
	)
}

function QuickCreateTaskBoard() {
	const { derived, actions } = useQuickCreate()

	if (!derived.displayTasks.length) {
		return null
	}

	return (
		<QuickCreateBoardSection
			footerLabel={derived.isShowingRecent ? '最近更新的任务' : '任务结果'}
			testId={
				derived.isShowingRecent ? 'quick-create-recent-tasks-section' : 'quick-create-tasks-section'
			}
		>
			<BoardGroupHeader
				count={derived.displayTasks.length}
				title={derived.isShowingRecent ? '最近任务' : '任务'}
				className='px-4 py-3'
			/>
			<BoardRows className='px-2 pb-2'>
				{derived.displayTasks.map((item, index) => (
					<QuickCreateTaskResultRowAdapter
						index={index}
						isActive={derived.activeResultIndex === index}
						item={item}
						key={item.id}
						onHover={actions.focusResult}
						onOpen={(task) => void actions.openResult({ kind: 'task', ...task })}
					/>
				))}
			</BoardRows>
		</QuickCreateBoardSection>
	)
}

function QuickCreateProjectBoard() {
	const { derived, actions } = useQuickCreate()

	if (!derived.displayProjects.length) {
		return null
	}

	const baseIndex = derived.displayTasks.length

	return (
		<QuickCreateBoardSection
			footerLabel={derived.isShowingRecent ? '最近更新的项目' : '项目结果'}
			testId={
				derived.isShowingRecent
					? 'quick-create-recent-projects-section'
					: 'quick-create-projects-section'
			}
		>
			<BoardGroupHeader
				count={derived.displayProjects.length}
				title={derived.isShowingRecent ? '最近项目' : '项目'}
				className='px-4 py-3'
			/>
			<BoardRows className='px-2 pb-2'>
				{derived.displayProjects.map((item, index) => (
					<QuickCreateProjectResultRowAdapter
						index={baseIndex + index}
						isActive={derived.activeResultIndex === baseIndex + index}
						item={item}
						key={item.id}
						onHover={actions.focusResult}
						onOpen={(project) => void actions.openResult({ kind: 'project', ...project })}
					/>
				))}
			</BoardRows>
		</QuickCreateBoardSection>
	)
}

function QuickCreateBoardSection({
	children,
	footerLabel,
	testId,
}: {
	children: ReactNode
	footerLabel: string
	testId: string
}) {
	return (
		<section
			className='overflow-hidden rounded-2xl border border-sf-border-subtle bg-background/96 shadow-[0_14px_34px_rgba(15,23,42,0.05)]'
			data-testid={testId}
		>
			<div>{children}</div>
			<div className='border-t border-sf-border-subtle/80 px-4 py-2 text-[11px] text-sf-text-quaternary'>
				{footerLabel}
			</div>
		</section>
	)
}

function logQuickCreateResize({
	chromeHeight,
	boardHeight,
	footerHeight,
	targetHeight,
}: {
	chromeHeight: number
	boardHeight: number
	footerHeight: number
	targetHeight: number
}) {
	console.info(
		'[quick-create] resize measurement chrome=%d board=%d footer=%d target=%d',
		Math.round(chromeHeight),
		Math.round(boardHeight),
		Math.round(footerHeight),
		Math.round(targetHeight),
	)
}
