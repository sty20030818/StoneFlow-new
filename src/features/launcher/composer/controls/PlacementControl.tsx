import { CheckIcon, FolderIcon, InboxIcon, TargetIcon } from 'lucide-react'

import type { LauncherPlacement, LauncherProjectOption } from '@/features/launcher/model/types'
import { Button } from '@/shared/components/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'
import {
	launcherMenuContentClass,
	launcherMenuItemClass,
} from '@/shared/components/patterns/launcher'

type PlacementControlProps = {
	open: boolean
	disabled?: boolean
	label: string
	options: LauncherProjectOption[]
	value: LauncherPlacement
	onOpenChange: (open: boolean) => void
	onPlacementChange: (placement: LauncherPlacement) => void
}

/**
 * 项目归属控件。
 * 这里保留项目搜索能力，因此继续使用 Popover，而不是退化成无搜索 dropdown。
 */
export function PlacementControl({
	open,
	disabled = false,
	label,
	options,
	value,
	onOpenChange,
	onPlacementChange,
}: PlacementControlProps) {
	const TriggerIcon =
		value.kind === 'inbox' ? InboxIcon : value.kind === 'noProject' ? TargetIcon : FolderIcon

	return (
		<DropdownMenu onOpenChange={onOpenChange} open={open}>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label='项目选择'
					className='max-w-52'
					disabled={disabled}
					size='sm'
					variant='outline'
				>
					<TriggerIcon className='size-3.5 text-sf-text-secondary' />
					<span className='truncate text-[12px]'>{label}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className={`w-60 ${launcherMenuContentClass}`}>
				<DropdownMenuGroup className='max-h-64 space-y-0.5 overflow-y-auto pr-0.5'>
					{options.map((option) => {
						const isSelected =
							option.kind === value.kind &&
							(option.kind !== 'project' || option.id === value.projectId)

						return (
							<DropdownMenuItem
								className={launcherMenuItemClass}
								key={`${option.kind}-${option.id ?? option.spaceId}`}
								onSelect={() =>
									onPlacementChange(
										option.kind === 'project'
											? { kind: 'project', projectId: option.id }
											: option.kind === 'noProject'
												? { kind: 'noProject', projectId: null }
												: { kind: 'inbox', projectId: null },
									)
								}
							>
								{option.kind === 'inbox' ? (
									<InboxIcon className='size-3.5 text-sf-text-secondary' />
								) : option.kind === 'noProject' ? (
									<TargetIcon className='size-3.5 text-sf-text-secondary' />
								) : (
									<FolderIcon className='size-3.5 text-sf-text-secondary' />
								)}
								<span className='min-w-0 flex-1 truncate'>{option.name}</span>
								{isSelected ? (
									<CheckIcon
										aria-hidden
										className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary'
									/>
								) : null}
							</DropdownMenuItem>
						)
					})}
					{options.length === 0 ? (
						<div className='px-2 py-3 text-[12px] text-sf-text-quaternary'>没有匹配的项目</div>
					) : null}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
