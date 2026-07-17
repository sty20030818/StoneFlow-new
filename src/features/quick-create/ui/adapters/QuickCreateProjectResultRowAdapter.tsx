import { FolderIcon } from 'lucide-react'

import type { QuickCreateProjectItem } from '@/features/quick-create/model/types'
import { RowShell } from '@/shared/components/row'

type QuickCreateProjectResultRowAdapterProps = {
	item: QuickCreateProjectItem
	index: number
	isActive: boolean
	onOpen: (item: QuickCreateProjectItem) => void
	onHover: (index: number) => void
}

export function QuickCreateProjectResultRowAdapter({
	item,
	index,
	isActive,
	onOpen,
	onHover,
}: QuickCreateProjectResultRowAdapterProps) {
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
						<div className='truncate text-[12.5px] text-foreground'>{item.name}</div>
						<div className='mt-0.5 truncate text-[11px] text-sf-text-quaternary'>
							{item.spaceName}
						</div>
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
