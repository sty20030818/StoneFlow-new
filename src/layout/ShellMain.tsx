import type { MouseEvent, PropsWithChildren } from 'react'
import { ContextMenu } from '@heroui-pro/react'

import { EntityDetailDrawerHost, type EntityDetailRouteState } from '@/features/entity-detail'
import { TaskPreview, useTaskPreviewController } from '@/features/task'
import { FolderPlusIcon, SquarePenIcon } from 'lucide-react'

type ShellMainProps = PropsWithChildren<{
	activeDetail: EntityDetailRouteState
	isCompact: boolean
	isDrawerOpen: boolean
	showPreview?: boolean
	onCloseDrawer: () => void
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
	isCompact,
	isDrawerOpen,
	showPreview = true,
	onCloseDrawer,
	onOpenTaskCreateDialog,
	onOpenProjectCreateDialog,
}: ShellMainProps) {
	const preview = useTaskPreviewController()

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
			event.stopPropagation()
			return
		}

		const nestedContextMenuTrigger = target.closest<HTMLElement>(
			'[data-slot="context-menu-trigger"]',
		)
		if (nestedContextMenuTrigger && event.currentTarget.contains(nestedContextMenuTrigger)) return

		if (
			target.closest(ENTITY_DETAIL_ROOT_SELECTOR) ||
			target.closest('[data-task-preview-root="true"]') ||
			target.closest(SHELL_TASK_CARD_SELECTOR) ||
			target.closest(INTERACTIVE_TARGET_SELECTOR)
		) {
			event.preventDefault()
			event.stopPropagation()
		}
	}

	return (
		<div className='relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-transparent'>
			<div className='flex min-h-0 min-w-0 flex-1 overflow-hidden'>
				<ContextMenu>
					<EntityDetailDrawerHost
						activeDetail={activeDetail}
						isCompact={isCompact}
						onClose={onCloseDrawer}
						open={isDrawerOpen}
					>
						<ContextMenu.Trigger className='flex min-h-0 min-w-0 flex-1 overflow-hidden'>
							<div
								className='relative flex min-h-0 min-w-0 flex-1 overflow-hidden'
								onContextMenuCapture={handleGlobalContextMenu}
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
							</div>
						</ContextMenu.Trigger>
					</EntityDetailDrawerHost>
					<ContextMenu.Popover className='w-40'>
						<ContextMenu.Menu aria-label='主界面操作'>
							<ContextMenu.Item onAction={onOpenTaskCreateDialog}>
								<SquarePenIcon />
								新建任务
							</ContextMenu.Item>
							<ContextMenu.Item onAction={onOpenProjectCreateDialog}>
								<FolderPlusIcon />
								新建项目
							</ContextMenu.Item>
						</ContextMenu.Menu>
					</ContextMenu.Popover>
				</ContextMenu>
			</div>
		</div>
	)
}
