import { useEffect, type MouseEvent, type PropsWithChildren } from 'react'

import {
	selectIsDrawerOpen,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import { ShellDrawer } from '@/app/layouts/shell/ShellDrawer'
import type { ShellDrawerKind } from '@/app/layouts/shell/types'
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuTrigger,
} from '@/shared/ui/base/context-menu'
import { FolderPlusIcon, SquarePenIcon } from 'lucide-react'

type ShellMainProps = PropsWithChildren<{
	currentSpaceId: string
	activeDrawerKind: ShellDrawerKind | null
	activeDrawerId: string | null
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
	currentSpaceId,
	activeDrawerKind,
	activeDrawerId,
	onCloseDrawer,
	onOpenTaskCreateDialog,
	onOpenProjectCreateDialog,
}: ShellMainProps) {
	const isDrawerOpen = useShellLayoutStore(selectIsDrawerOpen)

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
			target.closest(SHELL_TASK_CARD_SELECTOR) ||
			target.closest(DRAWER_OWNED_OVERLAY_SELECTOR) ||
			target.closest(INTERACTIVE_TARGET_SELECTOR)
		) {
			event.preventDefault()
		}
	}

	return (
		<main className='relative flex min-w-0 flex-1 overflow-hidden bg-transparent'>
			<div className='flex min-w-0 flex-1 pr-2'>
				<ContextMenu>
					<ContextMenuTrigger asChild onContextMenu={handleGlobalContextMenu}>
						<div className='relative flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-(--sf-color-border-subtle) bg-card shadow-(--sf-shadow-panel)'>
							<div className='no-scrollbar min-w-0 flex-1 overflow-y-auto'>
								<div className='flex min-h-full min-w-0 flex-col'>{children}</div>
							</div>

							<ShellDrawer
								activeDrawerId={activeDrawerId}
								activeDrawerKind={activeDrawerKind}
								currentSpaceId={currentSpaceId}
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
