import { Button, Dropdown } from '@heroui/react'
import { CheckIcon, FolderIcon, TargetIcon } from 'lucide-react'

import type { LauncherPlacement, LauncherProjectOption } from '../../model/types'
import { OverflowTooltip } from '@/shared/components/tooltip'

type PlacementControlProps = {
	open: boolean
	disabled?: boolean
	label: string
	options: LauncherProjectOption[]
	value: LauncherPlacement
	onOpenChange: (open: boolean) => void
	onPlacementChange: (placement: LauncherPlacement) => void
}

/** 项目归属控件；HeroUI Dropdown 自带键盘导航与 typeahead。 */
export function PlacementControl({
	open,
	disabled = false,
	label,
	options,
	value,
	onOpenChange,
	onPlacementChange,
}: PlacementControlProps) {
	const TriggerIcon = value.kind === 'standalone' ? TargetIcon : FolderIcon

	return (
		<Dropdown isOpen={open} onOpenChange={onOpenChange}>
			<Button
				aria-label='项目选择'
				className='max-w-52'
				isDisabled={disabled}
				size='sm'
				variant='outline'
			>
				<TriggerIcon className='size-3.5 text-muted' />
				{open ? (
					<span className='min-w-0 flex-1 truncate text-[12px]'>{label}</span>
				) : (
					<OverflowTooltip className='min-w-0 flex-1 text-[12px]' content={label}>
						{label}
					</OverflowTooltip>
				)}
			</Button>
			<Dropdown.Popover className='w-60' placement='bottom end'>
				<Dropdown.Menu aria-label='选择项目' className='max-h-64 overflow-y-auto'>
					{options.map((option) => {
						const isSelected =
							option.kind === value.kind &&
							(option.kind !== 'project' || option.id === value.projectId)

						return (
							<Dropdown.Item
								className='gap-2 p-2 text-[12.5px]'
								id={`${option.kind}-${option.id ?? option.spaceId}`}
								key={`${option.kind}-${option.id ?? option.spaceId}`}
								onAction={() =>
									onPlacementChange(
										option.kind === 'project'
											? { kind: 'project', projectId: option.id }
											: { kind: 'standalone', projectId: null },
									)
								}
								textValue={option.name}
							>
								{option.kind === 'standalone' ? (
									<TargetIcon className='size-3.5 text-muted' />
								) : (
									<FolderIcon className='size-3.5 text-muted' />
								)}
								<span className='min-w-0 flex-1 truncate'>{option.name}</span>
								{isSelected ? (
									<CheckIcon aria-hidden className='ml-auto size-3.5 shrink-0 text-muted' />
								) : null}
							</Dropdown.Item>
						)
					})}
					{options.length === 0 ? (
						<Dropdown.Item id='empty' isDisabled textValue='没有可用项目'>
							没有可用项目
						</Dropdown.Item>
					) : null}
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
