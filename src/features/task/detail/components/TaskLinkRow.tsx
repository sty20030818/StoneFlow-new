import { ExternalLinkIcon, MoreHorizontalIcon, PencilLineIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/shared/components/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'
import { ActionTooltip, OverflowTooltip } from '@/shared/components/tooltip'
import type { TaskLink } from '@/shared/types'

import { TaskLinkEditorPopover, type TaskLinkEditorValue } from './TaskLinkEditorPopover'

type TaskLinkRowProps = {
	link: TaskLink
	onOpen: (link: TaskLink) => Promise<void> | void
	onEdit: (linkId: string, value: TaskLinkEditorValue) => Promise<void>
	onRemove: (linkId: string) => Promise<void>
}

export function TaskLinkRow({ link, onOpen, onEdit, onRemove }: TaskLinkRowProps) {
	const [isMenuOpen, setMenuOpen] = useState(false)
	const [isEditorOpen, setEditorOpen] = useState(false)
	const [isMoreTooltipOpen, setMoreTooltipOpen] = useState(false)
	const linkSubtitle = formatLinkSubtitle(link.url)

	return (
		<TaskLinkEditorPopover
			anchor={
				<div className='flex items-start gap-3 rounded-xl border border-sf-border-subtle bg-card/70 px-3 py-2.5 hover:border-sf-border-secondary'>
					<div className='min-w-0 flex-1'>
						<OverflowTooltip
							className='text-[12px] font-medium text-legacy-foreground'
							content={link.title}
						>
							{link.title}
						</OverflowTooltip>
						<OverflowTooltip
							className='mt-1 text-[11px] text-sf-shell-text-tertiary'
							content={linkSubtitle}
						>
							{linkSubtitle}
						</OverflowTooltip>
					</div>
					<div className='flex shrink-0 items-center gap-1'>
						<Button
							aria-label={`打开链接：${link.title}`}
							className='h-7 px-2 text-[12px]'
							onClick={(event) => {
								event.stopPropagation()
								void onOpen(link)
							}}
							size='sm'
							type='button'
							variant='outline'
						>
							<ExternalLinkIcon className='size-3.5' />
							打开
						</Button>
						<DropdownMenu
							onOpenChange={(nextOpen) => {
								setMenuOpen(nextOpen)
								if (nextOpen) {
									setMoreTooltipOpen(false)
								}
							}}
							open={isMenuOpen}
						>
							<ActionTooltip
								isOpen={isMoreTooltipOpen && !isMenuOpen}
								label='更多链接操作'
								onOpenChange={(nextOpen) => setMoreTooltipOpen(nextOpen && !isMenuOpen)}
							>
								<DropdownMenuTrigger asChild>
									<Button
										aria-label={`更多链接操作：${link.title}`}
										className='size-7 p-0'
										onClick={(event) => event.stopPropagation()}
										size='icon'
										type='button'
										variant='outline'
									>
										<MoreHorizontalIcon className='size-4' />
									</Button>
								</DropdownMenuTrigger>
							</ActionTooltip>
							<DropdownMenuContent align='end' className='w-44' data-drawer-owned-overlay='true'>
								<DropdownMenuItem
									onSelect={(event) => {
										event.preventDefault()
										setMenuOpen(false)
										setEditorOpen(true)
									}}
								>
									<PencilLineIcon className='size-4' />
									编辑链接
								</DropdownMenuItem>
								<DropdownMenuItem
									variant='destructive'
									onSelect={(event) => {
										event.preventDefault()
										setMenuOpen(false)
										void onRemove(link.id)
									}}
								>
									<Trash2Icon className='size-4' />
									删除链接
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			}
			initialValue={{
				title: link.title,
				url: link.url,
			}}
			contentDrawerOwnedOverlay
			mode='edit'
			open={isEditorOpen}
			onOpenChange={setEditorOpen}
			onSubmit={(value) => onEdit(link.id, value)}
		/>
	)
}

function formatLinkSubtitle(url: string) {
	try {
		const parsed = new URL(url)
		return `${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`
	} catch {
		return url
	}
}
