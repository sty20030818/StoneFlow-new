import { useCallback, useLayoutEffect, useRef } from 'react'
import { CloseButton, Separator, Surface } from '@heroui/react'
import { Sheet } from '@heroui-pro/react'
import { UNSAFE_PortalProvider } from 'react-aria/PortalProvider'

import { TaskDetailContent, useTaskDetailViewModel } from '@/features/task'
import type { DetailPresentation } from '@/features/settings'
import { useRegisterOpenModal } from '@/shared/lib/modal-guard'

import type { EntityDetailRouteState } from '../model/entityDetailTypes'

type EntityDetailDrawerHostProps = {
	activeDetail: EntityDetailRouteState
	open: boolean
	effectivePresentation: DetailPresentation
	asideWidth: number
	onClose: () => void
	portalContainer: HTMLElement | null
}

export function EntityDetailDrawerHost({
	activeDetail,
	open,
	effectivePresentation,
	asideWidth,
	onClose,
	portalContainer,
}: EntityDetailDrawerHostProps) {
	const scrollPositions = useRef(new Map<string, number>())
	const returnFocusTarget = useRef<HTMLElement | null>(null)
	const returnFocusCollectionRoot = useRef<HTMLElement | null>(null)
	const wasOpen = useRef(false)
	useRegisterOpenModal(Boolean(open && activeDetail && effectivePresentation === 'sheet'))

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

	if (!open || !activeDetail) {
		return null
	}

	return (
		<TaskEntityDetail
			asideWidth={asideWidth}
			effectivePresentation={effectivePresentation}
			onClose={onClose}
			portalContainer={portalContainer}
			scrollPositions={scrollPositions.current}
			taskId={activeDetail.id}
		/>
	)
}

type TaskEntityDetailProps = Omit<EntityDetailDrawerHostProps, 'activeDetail' | 'open'> & {
	taskId: string
	scrollPositions: Map<string, number>
}

function TaskEntityDetail({
	taskId,
	effectivePresentation,
	asideWidth,
	onClose,
	portalContainer,
	scrollPositions,
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

	const content = (
		<TaskDetailContent onClose={onClose} scrollRef={setViewport} viewModel={viewModel} />
	)

	if (effectivePresentation === 'sheet') {
		return (
			<UNSAFE_PortalProvider getContainer={() => portalContainer}>
				<Sheet
					isDismissable
					isDetached
					isModal
					isOpen
					onOpenChange={(nextOpen) => {
						if (!nextOpen) onClose()
					}}
					placement='right'
				>
					<Sheet.Backdrop
						className='sf-entity-detail-backdrop'
						style={{ inset: 0, position: 'absolute' }}
						variant='opaque'
					>
						<Sheet.Content
							data-entity-detail-root='true'
							data-entity-detail-sheet='true'
							style={{
								bottom: '0.5rem',
								height: 'auto',
								maxWidth: 'calc(100% - 1rem)',
								position: 'absolute',
								right: '0.5rem',
								top: '0.5rem',
								width: 'min(40rem, calc(100% - 1rem))',
							}}
						>
							<Sheet.Dialog className='h-full overflow-hidden p-0'>
								<Sheet.Heading className='sr-only'>任务详情</Sheet.Heading>
								<Sheet.CloseTrigger aria-label='关闭任务详情' className='z-10' />
								{content}
							</Sheet.Dialog>
						</Sheet.Content>
					</Sheet.Backdrop>
				</Sheet>
			</UNSAFE_PortalProvider>
		)
	}

	return (
		<div
			className='flex min-h-0 shrink-0 overflow-hidden'
			data-entity-detail-root='true'
			data-entity-detail-aside='true'
		>
			<Separator orientation='vertical' />
			<aside aria-label='任务详情' className='min-h-0 shrink-0' style={{ width: asideWidth }}>
				<Surface className='relative flex h-full min-h-0 overflow-hidden rounded-none'>
					<CloseButton
						aria-label='关闭任务详情'
						className='absolute right-2 top-2 z-10'
						onPress={onClose}
					/>
					{content}
				</Surface>
			</aside>
		</div>
	)
}
