import { FolderIcon } from 'lucide-react'

import type { LauncherProjectItem } from '../../model/types'
import { RowShell } from '@/shared/components/row'
import { OverflowTooltip } from '@/shared/components/tooltip'

type ProjectResultRowAdapterProps = {
	item: LauncherProjectItem
	index: number
	isActive: boolean
	onOpen: (item: LauncherProjectItem) => void
	onHover: (index: number) => void
}

export function ProjectResultRowAdapter({
	item,
	index,
	isActive,
	onOpen,
	onHover,
}: ProjectResultRowAdapterProps) {
	return (
		<RowShell.Root
			active={isActive}
			aria-label={`打开项目 ${item.name}`}
			interactive
			onClick={() => onOpen(item)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					onOpen(item)
				}
			}}
			onMouseEnter={() => onHover(index)}
		>
			<RowShell.Left className='gap-3'>
				<RowShell.Leading>
					<span className='flex size-7 items-center justify-center rounded-md bg-sf-success-surface text-sf-success-surface-text'>
						<FolderIcon className='size-3.5' />
					</span>
				</RowShell.Leading>

				<RowShell.Title>
					<div className='min-w-0'>
						<OverflowTooltip className='text-[12.5px] text-legacy-foreground' content={item.name}>
							{item.name}
						</OverflowTooltip>
						<OverflowTooltip
							className='mt-0.5 text-[11px] text-sf-text-quaternary'
							content={item.spaceName}
						>
							{item.spaceName}
						</OverflowTooltip>
					</div>
				</RowShell.Title>
			</RowShell.Left>

			<RowShell.Right>
				<RowShell.Actions>
					<span className='rounded border border-sf-border-subtle px-1.5 py-0.5 text-[10.5px] text-sf-text-quaternary'>
						项目
					</span>
				</RowShell.Actions>
			</RowShell.Right>
		</RowShell.Root>
	)
}
