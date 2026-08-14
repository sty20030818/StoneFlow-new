import type { MouseEvent, PropsWithChildren } from 'react'

import { EntityDetailDrawerHost, type EntityDetailRouteState } from '@/features/entity-detail'
import type { DetailPresentation } from '@/features/settings'
import { TaskPreview, useTaskPreviewController } from '@/features/task'
import { useDetailPresentation } from '@/layout/model/useDetailPresentation'
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuTrigger,
} from '@/shared/components/base/context-menu'
import { FolderPlusIcon, SquarePenIcon } from 'lucide-react'

type ShellMainProps = PropsWithChildren<{
	activeDetail: EntityDetailRouteState
	detailPresentation: DetailPresentation
	isCompact: boolean
	isDrawerOpen: boolean
	showPreview?: boolean
	onCloseDrawer: () => void
	onDetailPresentationChange: (presentation: DetailPresentation) => void
	onOpenTaskCreateDialog: () => void
	onOpenProjectCreateDialog: () => void
}>

const ENTITY_DETAIL_ROOT_SELECTOR = '[data-entity-detail-root="true"]'
const SHELL_TASK_CARD_SELECTOR = '[data-shell-task-card="true"]'
const INTERACTIVE_TARGET_SELECTOR = [
	'button',
	'a[href]',
	'input',
	'textarea',
	'select',
	'summary',
	'label[for]',
	'[contenteditable="true"]',
	'[role="button"]',
	'[role="link"]',
	'[role="menuitem"]',
	'[role="combobox"]',
	'[role="option"]',
	'[role="tab"]',
	'[data-slot="button"]',
	'[data-slot="dropdown-menu-trigger"]',
	'[data-slot="dropdown-menu-content"]',
	'[data-slot="context-menu-content"]',
	'[data-slot="command-input"]',
	'[data-slot="tabs-trigger"]',
].join(', ')

export function ShellMain({
	children,
	activeDetail,
	detailPresentation,
	isCompact,
	isDrawerOpen,
	showPreview = true,
	onCloseDrawer,
	onDetailPresentationChange,
	onOpenTaskCreateDialog,
	onOpenProjectCreateDialog,
}: ShellMainProps) {
	const preview = useTaskPreviewController()
	const detail = useDetailPresentation({ detailPresentation, isCompact })

	const handleMainPointerDownCapture = (event: MouseEvent<HTMLElement>) => {
		if (!preview.previewState.open || isDrawerOpen) {
			return
		}

		const target = event.target
		if (!(target instanceof HTMLElement)) {
			return
		}

		if (
			target.closest('[data-task-preview-root="true"]') ||
			target.closest(SHELL_TASK_CARD_SELECTOR)
		) {
			return
		}

		preview.closePreview()
	}

	const handleGlobalContextMenu = (event: MouseEvent<HTMLElement>) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) {
			event.preventDefault()
			return
		}

		if (
			target.closest(ENTITY_DETAIL_ROOT_SELECTOR) ||
			target.closest('[data-task-preview-root="true"]') ||
			target.closest(SHELL_TASK_CARD_SELECTOR) ||
			target.closest(INTERACTIVE_TARGET_SELECTOR)
		) {
			event.preventDefault()
		}
	}

	return (
		<div
			ref={detail.panelRef}
			className='relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-transparent'
		>
			<div className='flex min-h-0 min-w-0 flex-1 overflow-hidden'>
				<ContextMenu>
					<ContextMenuTrigger asChild onContextMenu={handleGlobalContextMenu}>
						<div
							className='relative flex min-h-0 min-w-0 flex-1 overflow-hidden'
							onPointerDownCapture={handleMainPointerDownCapture}
						>
							<div className='flex min-w-0 flex-1 flex-col overflow-hidden'>{children}</div>

							{showPreview && !isDrawerOpen && preview.previewState.open ? (
								<TaskPreview
									linkSummary={preview.linkSummary}
									onPointerEnter={() => preview.setPreviewPointerInside(true)}
									onPointerLeave={() => {
										preview.setPreviewPointerInside(false)
										preview.scheduleClosePreview()
									}}
									task={preview.targetTask}
								/>
							) : null}

							<EntityDetailDrawerHost
								activeDetail={activeDetail}
								asideWidth={detail.asideWidth}
								effectivePresentation={detail.effectivePresentation}
								onClose={onCloseDrawer}
								onPresentationPreferenceChange={onDetailPresentationChange}
								open={isDrawerOpen}
								presentationPreference={detailPresentation}
							/>
						</div>
					</ContextMenuTrigger>
					<ContextMenuContent className='w-40'>
						<ContextMenuGroup>
							<ContextMenuItem onSelect={onOpenTaskCreateDialog}>
								<SquarePenIcon />
								新建任务
							</ContextMenuItem>
							<ContextMenuItem onSelect={onOpenProjectCreateDialog}>
								<FolderPlusIcon />
								新建项目
							</ContextMenuItem>
						</ContextMenuGroup>
					</ContextMenuContent>
				</ContextMenu>
			</div>
		</div>
	)
}
