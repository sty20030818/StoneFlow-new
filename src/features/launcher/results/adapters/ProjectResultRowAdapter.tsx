import { Button } from '@heroui/react'
import { FolderIcon } from 'lucide-react'
import type { KeyboardEventHandler, Ref } from 'react'

import type { LauncherProjectItem } from '../../model/types'
import { OverflowTooltip } from '@/shared/components/tooltip'
import { cn } from '@/shared/lib/utils'

type ProjectResultRowAdapterProps = {
	item: LauncherProjectItem
	isActive: boolean
	onOpen: (item: LauncherProjectItem) => void
	onFocus: () => void
	onKeyDown: KeyboardEventHandler<HTMLButtonElement>
	rowRef: Ref<HTMLButtonElement>
}

export function ProjectResultRowAdapter({
	item,
	isActive,
	onOpen,
	onFocus,
	onKeyDown,
	rowRef,
}: ProjectResultRowAdapterProps) {
	return (
		<div role='listitem'>
			<Button
				aria-label={`打开项目 ${item.name}`}
				className={cn(
					'h-auto min-h-12 w-full justify-start gap-3 rounded-lg px-3 py-1.5 text-left',
					isActive && 'bg-accent-soft text-accent-soft-foreground',
				)}
				fullWidth
				onFocus={onFocus}
				onHoverStart={onFocus}
				onKeyDown={onKeyDown}
				onPress={() => onOpen(item)}
				ref={rowRef}
				type='button'
				variant='ghost'
			>
				<div className='flex min-w-0 flex-1 items-center gap-3'>
					<span className='flex size-7 shrink-0 items-center justify-center rounded-md bg-success-soft text-success-soft-foreground'>
						<FolderIcon className='size-3.5' />
					</span>

					<div className='min-w-0 flex-1'>
						<OverflowTooltip className='text-[12.5px] text-foreground' content={item.name}>
							{item.name}
						</OverflowTooltip>
						<OverflowTooltip className='mt-0.5 text-[11px] text-muted' content={item.spaceName}>
							{item.spaceName}
						</OverflowTooltip>
					</div>
				</div>

				<div className='shrink-0'>
					<span className='rounded border border-border px-1.5 py-0.5 text-[10.5px] text-muted'>
						项目
					</span>
				</div>
			</Button>
		</div>
	)
}
