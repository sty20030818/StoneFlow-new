import { useCallback, useEffect, useLayoutEffect, useRef, type PropsWithChildren } from 'react'
import { CloseButton, Surface } from '@heroui/react'
import { Resizable } from '@heroui-pro/react/resizable'

import { TaskDetailContent, useTaskDetailViewModel } from '@/features/task'
import { SHELL_DESKTOP_MEDIA_QUERY } from '@/shared/lib/shellSidebarGeometry'

import type { EntityDetailRouteState } from '../model/entityDetailTypes'

type EntityDetailDrawerHostProps = PropsWithChildren<{
	activeDetail: EntityDetailRouteState
	open: boolean
	onClose: () => void
}>

export function EntityDetailDrawerHost({
	activeDetail,
	open,
	onClose,
	children,
}: EntityDetailDrawerHostProps) {
	const scrollPositions = useRef(new Map<string, number>())
	const returnFocusTarget = useRef<HTMLElement | null>(null)
	const returnFocusCollectionRoot = useRef<HTMLElement | null>(null)
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
		}

		if (!open && wasOpen.current) {
			queueMicrotask(() => {
				const focusTarget = returnFocusTarget.current?.isConnected
					? returnFocusTarget.current
					: returnFocusCollectionRoot.current?.isConnected
						? returnFocusCollectionRoot.current
						: null
				focusTarget?.focus({ preventScroll: true })
			})
		}

		wasOpen.current = open
	}, [open])

	if ((!open || !activeDetail) && children == null) {
		return null
	}

	return (
		<Resizable className='min-h-0 min-w-0 flex-1' orientation='horizontal'>
			<Resizable.Panel className='flex min-h-0 min-w-0' id='task-list'>
				{children}
			</Resizable.Panel>
			{open && activeDetail ? (
				<TaskEntityDetail
					onClose={onClose}
					scrollPositions={scrollPositions.current}
					taskId={activeDetail.id}
				/>
			) : null}
		</Resizable>
	)
}

type TaskEntityDetailProps = Omit<
	EntityDetailDrawerHostProps,
	'activeDetail' | 'children' | 'open'
> & {
	taskId: string
	scrollPositions: Map<string, number>
}

function TaskEntityDetail({ taskId, onClose, scrollPositions }: TaskEntityDetailProps) {
	const viewModel = useTaskDetailViewModel({ taskId, onClose })
	const flushNow = viewModel.autosave.flushNow
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
	useEffect(() => {
		if (typeof window.matchMedia !== 'function') {
			return
		}

		const mediaQuery = window.matchMedia(SHELL_DESKTOP_MEDIA_QUERY)
		let cancelled = false
		let closing = false
		const closeForCompact = async () => {
			if (closing) {
				return
			}

			closing = true
			const saved = await flushNow()
			if (saved && !cancelled && !mediaQuery.matches) {
				onClose()
			}
			closing = false
		}
		const handleChange = (event: MediaQueryListEvent) => {
			if (!event.matches) {
				void closeForCompact()
			}
		}

		mediaQuery.addEventListener('change', handleChange)
		if (!mediaQuery.matches) {
			void closeForCompact()
		}

		return () => {
			cancelled = true
			mediaQuery.removeEventListener('change', handleChange)
		}
	}, [flushNow, onClose, taskId])

	return (
		<>
			<Resizable.Handle aria-label='调整任务详情宽度' type='line' variant='secondary' />
			<Resizable.Panel
				className='flex min-h-0'
				defaultSize='400px'
				groupResizeBehavior='preserve-pixel-size'
				id='task-detail'
				maxSize='560px'
				minSize='400px'
			>
				<aside
					aria-label='任务详情'
					className='h-full min-h-0 w-full'
					data-entity-detail-aside='true'
					data-entity-detail-root='true'
					onContextMenu={(event) => event.preventDefault()}
				>
					<Surface className='relative flex h-full min-h-0 overflow-hidden rounded-none'>
						<CloseButton
							aria-label='关闭任务详情'
							className='absolute right-2 top-2 z-10'
							onPress={onClose}
						/>
						<TaskDetailContent onClose={onClose} scrollRef={setViewport} viewModel={viewModel} />
					</Surface>
				</aside>
			</Resizable.Panel>
		</>
	)
}
