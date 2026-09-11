import { useCallback, useLayoutEffect, useRef, useState, type PropsWithChildren } from 'react'
import { Surface } from '@heroui/react'
import { Sheet } from '@heroui-pro/react'
import { Resizable } from '@heroui-pro/react/resizable'
import { useExitAnimation } from '@react-aria/utils'
import { UNSAFE_PortalProvider } from 'react-aria'

import { focusTaskBoardTaskId, TaskDetailContent, useTaskDetailViewModel } from '@/features/task'

import type { EntityDetailRouteState } from '../model/entityDetailTypes'

const TASK_LIST_MIN_WIDTH = 352
const TASK_DETAIL_MIN_WIDTH = 320
const TASK_DETAIL_DEFAULT_WIDTH = 360
const TASK_DETAIL_MAX_WIDTH = 440

type EntityDetailDrawerHostProps = PropsWithChildren<{
	activeDetail: EntityDetailRouteState
	isCompact: boolean
	open: boolean
	onClose: () => void
}>

export function EntityDetailDrawerHost({
	activeDetail,
	isCompact,
	open,
	onClose,
	children,
}: EntityDetailDrawerHostProps) {
	const [sheetContainer, setSheetContainer] = useState<HTMLDivElement | null>(null)
	const [scrollPositions] = useState(() => new Map<string, number>())
	const returnFocusTarget = useRef<HTMLElement | null>(null)
	const returnFocusCollectionRoot = useRef<HTMLElement | null>(null)
	const returnFocusTaskId = useRef<string | null>(null)
	const wasOpen = useRef(false)
	const motionElement = useRef<HTMLElement | null>(null)
	const asideContent = useRef<HTMLElement | null>(null)
	const detailAnimation = useRef<Animation | null>(null)
	const taskId = open ? (activeDetail?.id ?? null) : null
	const isOpen = taskId !== null
	const [displayedTaskId, setDisplayedTaskId] = useState(taskId)
	const setMotionElement = useCallback(
		(node: HTMLElement | null) => {
			if (!node) {
				detailAnimation.current?.cancel()
				detailAnimation.current = null
			}
			asideContent.current = isCompact ? null : node
			// Resizable 的 className/ref 内容层不拥有占位；退出必须等待真正的外层 Panel。
			motionElement.current = isCompact
				? node
				: (node?.closest<HTMLElement>('[data-panel]') ?? null)
		},
		[isCompact],
	)

	useLayoutEffect(() => {
		const panel = motionElement.current
		const content = asideContent.current
		if (!panel || !content) return
		const releaseSize = () => {
			detailAnimation.current?.cancel()
			detailAnimation.current = null
			content.style.width = ''
		}

		// 反转先取当前画面，再取消旧效果；终点仍由 Resizable 的自然布局决定。
		const fromWidth = detailAnimation.current || !isOpen ? panel.getBoundingClientRect().width : 0
		releaseSize()
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
		let disposed = false
		const start = () => {
			if (disposed || reducedMotion.matches) return
			const expandedWidth = panel.getBoundingClientRect().width
			if (expandedWidth <= 0) return
			const toWidth = isOpen ? expandedWidth : 0
			if (fromWidth === toWidth) return
			content.style.width = `${expandedWidth}px`
			const animation = panel.animate(
				[{ maxWidth: `${fromWidth}px` }, { maxWidth: `${toWidth}px` }],
				{ duration: 200, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'both' },
			)
			detailAnimation.current = animation
			animation.onfinish = () => {
				if (!isOpen || detailAnimation.current !== animation) return
				releaseSize()
			}
		}
		// 首次打开需等子 Panel 注册后的同步布局完成；关闭必须先启动，再交给退出 hook 等待。
		if (isOpen) queueMicrotask(start)
		else start()

		const finishForReducedMotion = () => {
			if (reducedMotion.matches) detailAnimation.current?.finish()
		}
		const releaseBeforeInteraction = (event: Event) => {
			if (
				isOpen &&
				(event.type === 'pointerdown' ||
					(event.target instanceof Element && event.target.closest('[data-separator]')))
			) {
				// 拖拽热区可落在相邻内容上；用户交互优先，同步交还尺寸，不等异步 finish 事件。
				releaseSize()
			}
		}
		const group = panel.parentElement
		reducedMotion.addEventListener('change', finishForReducedMotion)
		group?.addEventListener('pointerdown', releaseBeforeInteraction, true)
		group?.addEventListener('keydown', releaseBeforeInteraction, true)
		return () => {
			disposed = true
			reducedMotion.removeEventListener('change', finishForReducedMotion)
			group?.removeEventListener('pointerdown', releaseBeforeInteraction, true)
			group?.removeEventListener('keydown', releaseBeforeInteraction, true)
		}
	}, [isOpen, isCompact])
	const isExiting = useExitAnimation(motionElement, isOpen)

	// 只为退出画面保留身份；开闭与保存仍由 URL 和详情 view model 决定。
	if (taskId !== null && taskId !== displayedTaskId) {
		setDisplayedTaskId(taskId)
	}
	const renderedTaskId = taskId ?? (isExiting ? displayedTaskId : null)

	useLayoutEffect(() => {
		if (isOpen && !wasOpen.current) {
			const activeElement = document.activeElement
			returnFocusTarget.current =
				activeElement instanceof HTMLElement && activeElement !== document.body
					? activeElement
					: null
			returnFocusCollectionRoot.current =
				activeElement instanceof HTMLElement
					? activeElement.closest<HTMLElement>('[data-board-root="true"]')
					: null
			returnFocusTaskId.current =
				activeElement instanceof HTMLElement
					? (activeElement.closest<HTMLElement>('[data-task-id]')?.dataset.taskId ?? null)
					: null
		}

		if (!isOpen && wasOpen.current) {
			queueMicrotask(() => {
				if (wasOpen.current) return
				if (returnFocusTarget.current?.isConnected) {
					returnFocusTarget.current.focus({ preventScroll: true })
					return
				}

				returnFocusCollectionRoot.current?.focus({ preventScroll: true })
				if (returnFocusTaskId.current) focusTaskBoardTaskId(returnFocusTaskId.current)
			})
		}

		wasOpen.current = isOpen
	}, [isOpen, isCompact])

	if (!renderedTaskId && children == null) {
		return null
	}

	return (
		<div
			className='relative isolate flex min-h-0 min-w-0 flex-1 overflow-hidden'
			data-entity-detail-layout='true'
			ref={setSheetContainer}
		>
			<Resizable className='min-h-0 min-w-0 flex-1' orientation='horizontal'>
				<Resizable.Panel
					className='flex min-h-0 min-w-0'
					id='task-list'
					minSize={renderedTaskId && !isCompact ? `${TASK_LIST_MIN_WIDTH}px` : undefined}
				>
					{children}
				</Resizable.Panel>
				{renderedTaskId ? (
					<TaskEntityDetail
						isCompact={isCompact}
						isOpen={isOpen}
						onClose={onClose}
						scrollPositions={scrollPositions}
						setMotionElement={setMotionElement}
						sheetContainer={sheetContainer}
						taskId={renderedTaskId}
					/>
				) : null}
			</Resizable>
		</div>
	)
}

type TaskEntityDetailProps = {
	isCompact: boolean
	isOpen: boolean
	onClose: () => void
	scrollPositions: Map<string, number>
	setMotionElement: (node: HTMLElement | null) => void
	sheetContainer: HTMLDivElement | null
	taskId: string
}

function TaskEntityDetail({
	isCompact,
	isOpen,
	onClose,
	scrollPositions,
	setMotionElement,
	sheetContainer,
	taskId,
}: TaskEntityDetailProps) {
	const viewModel = useTaskDetailViewModel({ taskId, onClose })
	const viewport = useRef<HTMLDivElement | null>(null)
	const setViewport = useCallback(
		(node: HTMLDivElement | null) => {
			if (viewport.current) {
				scrollPositions.set(taskId, viewport.current.scrollTop)
			}

			viewport.current = node
			if (node) {
				node.scrollTop = scrollPositions.get(taskId) ?? 0
			}
		},
		[scrollPositions, taskId],
	)

	if (isCompact) {
		if (!sheetContainer) {
			return null
		}

		return (
			<UNSAFE_PortalProvider getContainer={() => sheetContainer}>
				<Sheet
					container={sheetContainer}
					isDetached
					isDismissable
					isModal
					isOpen={isOpen}
					onOpenChange={(nextOpen) => {
						if (!nextOpen) {
							onClose()
						}
					}}
					placement='right'
					shouldAutoFocus
				>
					<Sheet.Backdrop
						className='absolute inset-0 overflow-hidden before:absolute before:inset-0'
						variant='opaque'
					>
						<Sheet.Content
							aria-hidden={!isOpen || undefined}
							className='absolute h-auto w-[min(420px,calc(100%-16px))] max-w-none'
							data-entity-detail-root='true'
							data-entity-detail-sheet='true'
							inert={!isOpen}
							onContextMenu={(event) => event.preventDefault()}
							ref={setMotionElement}
						>
							<Sheet.Dialog
								className='h-full min-h-0 overflow-hidden'
								render={(dialogProps) => (
									<section
										{...dialogProps}
										onKeyDown={(event) => {
											if (event.key === 'Tab') return
											if (event.key !== 'Escape' || event.defaultPrevented) event.stopPropagation()
										}}
									/>
								)}
							>
								<Sheet.Heading className='sr-only'>任务详情</Sheet.Heading>
								<TaskDetailContent
									onClose={onClose}
									scrollRef={setViewport}
									viewModel={viewModel}
								/>
							</Sheet.Dialog>
						</Sheet.Content>
					</Sheet.Backdrop>
				</Sheet>
			</UNSAFE_PortalProvider>
		)
	}

	return (
		<>
			<Resizable.Handle
				aria-label='调整任务详情宽度'
				disabled={!isOpen}
				type='line'
				variant='secondary'
			/>
			<Resizable.Panel
				className='flex min-h-0'
				defaultSize={`${TASK_DETAIL_DEFAULT_WIDTH}px`}
				groupResizeBehavior='preserve-pixel-size'
				id='task-detail'
				maxSize={`${TASK_DETAIL_MAX_WIDTH}px`}
				minSize={`${TASK_DETAIL_MIN_WIDTH}px`}
			>
				<aside
					aria-hidden={!isOpen || undefined}
					aria-label='任务详情'
					className='h-full min-h-0 w-full'
					data-detail-open={isOpen}
					data-entity-detail-aside='true'
					data-entity-detail-root='true'
					inert={!isOpen}
					onContextMenu={(event) => event.preventDefault()}
					ref={setMotionElement}
				>
					<Surface className='relative flex h-full min-h-0 overflow-hidden'>
						<TaskDetailContent
							onClose={onClose}
							scrollRef={setViewport}
							showCloseButton
							viewModel={viewModel}
						/>
					</Surface>
				</aside>
			</Resizable.Panel>
		</>
	)
}
