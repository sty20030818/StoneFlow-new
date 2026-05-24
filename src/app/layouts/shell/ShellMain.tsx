import { useEffect, type MouseEvent, type PropsWithChildren } from 'react'

import { ShellDrawer } from '@/app/layouts/shell/ShellDrawer'
import type { EntityDetailRouteState } from '@/features/entity-detail'
import { TaskPreview, useTaskPreviewController } from '@/features/task/detail'
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuTrigger,
} from '@/shared/ui/base/context-menu'
import { cn } from '@/shared/lib/utils'
import { FolderPlusIcon, SquarePenIcon } from 'lucide-react'

type ShellMainProps = PropsWithChildren<{
	currentSpaceLabel: string
	activeDetail: EntityDetailRouteState
	isDrawerOpen: boolean
	showPreview?: boolean
	onCloseDrawer: () => void
	onOpenTaskCreateDialog: () => void
	onOpenProjectCreateDialog: () => void
}>

const SHELL_DRAWER_ROOT_SELECTOR = '[data-shell-drawer-root="true"]'
const SHELL_TASK_CARD_SELECTOR = '[data-shell-task-card="true"]'
const DRAWER_OWNED_OVERLAY_SELECTOR = '[data-drawer-owned-overlay="true"]'
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
	currentSpaceLabel,
	activeDetail,
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

	useEffect(() => {
		if (!isDrawerOpen) {
			return undefined
		}

		const handleDocumentPointerDown = (event: PointerEvent) => {
			const target = event.target
			if (!(target instanceof HTMLElement)) {
				return
			}

			if (target.closest(SHELL_DRAWER_ROOT_SELECTOR)) {
				return
			}

			if (target.closest(SHELL_TASK_CARD_SELECTOR)) {
				return
			}

			if (target.closest(DRAWER_OWNED_OVERLAY_SELECTOR)) {
				return
			}

			// 当 Drawer 自己的浮层打开时，外部空白优先让浮层按原语义收起，不直接关闭 Drawer。
			const hasOpenDrawerOwnedOverlay = !!document.querySelector(
				`${DRAWER_OWNED_OVERLAY_SELECTOR}[data-state="open"]`,
			)

			if (hasOpenDrawerOwnedOverlay) {
				return
			}

			if (target.closest(INTERACTIVE_TARGET_SELECTOR)) {
				return
			}

			onCloseDrawer()
		}

		document.addEventListener('pointerdown', handleDocumentPointerDown, true)

		return () => {
			document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
		}
	}, [isDrawerOpen, onCloseDrawer])

	const handleGlobalContextMenu = (event: MouseEvent<HTMLElement>) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) {
			event.preventDefault()
			return
		}

		if (
			target.closest(SHELL_DRAWER_ROOT_SELECTOR) ||
			target.closest('[data-task-preview-root="true"]') ||
			target.closest(SHELL_TASK_CARD_SELECTOR) ||
			target.closest(DRAWER_OWNED_OVERLAY_SELECTOR) ||
			target.closest(INTERACTIVE_TARGET_SELECTOR)
		) {
			event.preventDefault()
		}
	}

	return (
		<main className='relative flex min-w-0 flex-1 overflow-hidden bg-transparent'>
			{/* mobile：仅去掉主卡左右 gutter（pr-2）与圆角；卡片边框/阴影/底色保持不动 */}
			<div className='flex min-w-0 flex-1 overflow-hidden px-0 pr-2 group-data-[sidebar-layout=mobile]/sidebar-wrapper:px-0'>
				<ContextMenu>
					<ContextMenuTrigger asChild onContextMenu={handleGlobalContextMenu}>
						<div
							className={cn(
								'relative flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-sf-border-subtle bg-card group-data-[sidebar-layout=mobile]/sidebar-wrapper:rounded-none',
								// 桌面：外阴影会落到下方 Footer；壳内主卡保持平面（mobile 仍保留轻微层次）
								'group-data-[sidebar-layout=desktop]/sidebar-wrapper:shadow-none',
								'group-data-[sidebar-layout=mobile]/sidebar-wrapper:shadow-(--sf-shadow-panel)',
							)}
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

							<ShellDrawer
								activeDetail={activeDetail}
								currentSpaceLabel={currentSpaceLabel}
								onClose={onCloseDrawer}
								open={isDrawerOpen}
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
		</main>
	)
}
