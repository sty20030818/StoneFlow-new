import { Button } from '@heroui/react'
import { FolderIcon } from 'lucide-react'
import type { KeyboardEventHandler, Ref } from 'react'

import type { LauncherProjectItem } from '../../model/types'
import { OverflowTooltip } from '@/shared/components/tooltip'

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
				aria-current={isActive ? 'true' : undefined}
				aria-label={`打开项目 ${item.name}`}
				className='min-h-11'
				data-content-height='true'
				fullWidth
				onFocus={onFocus}
				onHoverStart={onFocus}
				onKeyDown={onKeyDown}
				onPress={() => onOpen(item)}
				ref={rowRef}
				type='button'
				variant='ghost'
			>
				<div className='flex w-full min-w-0 items-center gap-3 text-left'>
					<div className='flex min-w-0 flex-1 items-center gap-3'>
						<span className='flex size-5 shrink-0 items-center justify-center text-muted'>
							<FolderIcon className='size-4' />
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
				</div>
			</Button>
		</div>
	)
}
