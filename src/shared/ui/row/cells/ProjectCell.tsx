import { CheckIcon, FolderIcon } from 'lucide-react'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { RowMetaButton } from '@/shared/ui/row/RowFieldCells'
import { stopRowEventPropagation } from '@/shared/ui/row/RowFieldCells'

export type ProjectCellOption = {
	id: string
	name: string
}

export type ProjectCellProps = {
	projectName?: string | null
	options?: ProjectCellOption[]
	disabled?: boolean
	onSelectProject?: (projectId: string) => void
	onSelectNone?: () => void
	emptyLabel?: string
}

export function ProjectCell({
	projectName,
	options,
	disabled,
	onSelectProject,
	onSelectNone,
	emptyLabel = '独立事项',
}: ProjectCellProps) {
	if (!options || options.length === 0 || !onSelectProject || !onSelectNone) {
		return (
			<RowMetaButton
				disabled={disabled ?? !projectName}
				icon={<FolderIcon className='size-3.5' />}
				label={projectName || emptyLabel}
				type='button'
			/>
		)
	}

	return (
		<div onClick={stopRowEventPropagation} onPointerDown={stopRowEventPropagation}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<RowMetaButton
						disabled={disabled}
						icon={<FolderIcon className='size-3.5' />}
						label={projectName || emptyLabel}
						type='button'
					/>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='start' sideOffset={6}>
					<DropdownMenuGroup>
						<DropdownMenuItem className='gap-2 p-2' onSelect={onSelectNone}>
							<span className='min-w-0 flex-1 truncate'>{emptyLabel}</span>
							{!projectName ? (
								<CheckIcon
									aria-hidden
									className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary'
								/>
							) : null}
						</DropdownMenuItem>
						{options.map((option) => (
							<DropdownMenuItem
								className='gap-2 p-2'
								key={option.id}
								onSelect={() => onSelectProject(option.id)}
							>
								<span className='min-w-0 flex-1 truncate'>{option.name}</span>
								{projectName === option.name ? (
									<CheckIcon
										aria-hidden
										className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary'
									/>
								) : null}
							</DropdownMenuItem>
						))}
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
