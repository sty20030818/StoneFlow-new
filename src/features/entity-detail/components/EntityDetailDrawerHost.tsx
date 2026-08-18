import { useCallback, useLayoutEffect, useRef, useState, type PropsWithChildren } from 'react'
import { Surface } from '@heroui/react'
import { Sheet } from '@heroui-pro/react'
import { Resizable } from '@heroui-pro/react/resizable'
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
	const scrollPositions = useRef(new Map<string, number>())
	const returnFocusTarget = useRef<HTMLElement | null>(null)
	const returnFocusCollectionRoot = useRef<HTMLElement | null>(null)
	const returnFocusTaskId = useRef<string | null>(null)
	const wasOpen = useRef(false)

	useLayoutEffect(() => {
		if (open && !wasOpen.current) {
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

		if (!open && wasOpen.current) {
			queueMicrotask(() => {
				if (returnFocusTarget.current?.isConnected) {
					returnFocusTarget.current.focus({ preventScroll: true })
					return
				}

				returnFocusCollectionRoot.current?.focus({ preventScroll: true })
				if (returnFocusTaskId.current) focusTaskBoardTaskId(returnFocusTaskId.current)
			})
		}

		wasOpen.current = open
	}, [open])

	if ((!open || !activeDetail) && children == null) {
		return null
	}

	const detail = open ? activeDetail : null

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
					minSize={detail && !isCompact ? `${TASK_LIST_MIN_WIDTH}px` : undefined}
				>
					{children}
				</Resizable.Panel>
				{detail ? (
					<TaskEntityDetail
						isCompact={isCompact}
						onClose={onClose}
						scrollPositions={scrollPositions.current}
						sheetContainer={sheetContainer}
						taskId={detail.id}
					/>
				) : null}
			</Resizable>
		</div>
	)
}

type TaskEntityDetailProps = {
	isCompact: boolean
	onClose: () => void
	scrollPositions: Map<string, number>
	sheetContainer: HTMLDivElement | null
	taskId: string
}

function TaskEntityDetail({
	isCompact,
	onClose,
	scrollPositions,
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
					isOpen
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
							className='absolute h-auto w-[min(420px,calc(100%-16px))] max-w-none'
							data-entity-detail-root='true'
							data-entity-detail-sheet='true'
							onContextMenu={(event) => event.preventDefault()}
						>
							<Sheet.Dialog
								className='h-full min-h-0 overflow-hidden'
								render={(dialogProps) => (
									<section
										{...dialogProps}
										onKeyDown={(event) => {
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
			<Resizable.Handle aria-label='调整任务详情宽度' type='line' variant='secondary' />
			<Resizable.Panel
				className='flex min-h-0'
				defaultSize={`${TASK_DETAIL_DEFAULT_WIDTH}px`}
				groupResizeBehavior='preserve-pixel-size'
				id='task-detail'
				maxSize={`${TASK_DETAIL_MAX_WIDTH}px`}
				minSize={`${TASK_DETAIL_MIN_WIDTH}px`}
			>
				<aside
					aria-label='任务详情'
					className='h-full min-h-0 w-full'
					data-entity-detail-aside='true'
					data-entity-detail-root='true'
					onContextMenu={(event) => event.preventDefault()}
				>
					<Surface className='relative flex h-full min-h-0 overflow-hidden rounded-none'>
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
