import { CheckIcon, FolderIcon } from 'lucide-react'
import { useMemo } from 'react'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { RowMetaButton } from '@/shared/ui/row/RowFieldCells'
import { stopRowEventPropagation } from '@/shared/ui/row/RowFieldCells'
import { buildDigitShortcutMap, ShortcutDigitSelectLayer, ShortcutMenuItemHint } from '@/shared/ui/shortcut-menu'

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

const EMPTY_PROJECT_OPTIONS: ProjectCellOption[] = []

export function ProjectCell({
	projectName,
	options,
	disabled,
	onSelectProject,
	onSelectNone,
	emptyLabel = '独立事项',
}: ProjectCellProps) {
	const normalizedOptions = options ?? EMPTY_PROJECT_OPTIONS
	const shortcutItems = useMemo(
		() => [
			{ label: emptyLabel, value: 'empty' as const, isEmptyValue: true, disabled: false },
			...normalizedOptions.map((option) => ({
				label: option.name,
				value: option.id,
				disabled: false,
			})),
		],
		[emptyLabel, normalizedOptions],
	)
	const digitShortcutMap = useMemo(() => buildDigitShortcutMap(shortcutItems), [shortcutItems])

	if (normalizedOptions.length === 0 || !onSelectProject || !onSelectNone) {
		return null
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
					<ShortcutDigitSelectLayer
						items={shortcutItems}
						onSelect={(item) => {
							if (item.isEmptyValue) {
								onSelectNone?.()
							} else {
								onSelectProject?.(String(item.value))
							}
						}}
					/>
					<DropdownMenuGroup>
						<DropdownMenuItem
							className='gap-2 p-2'
							onSelect={onSelectNone}
						>
							<span className='min-w-0 flex-1 truncate'>{emptyLabel}</span>
							<ShortcutMenuItemHint digit={digitShortcutMap[0]?.digit ?? ''} />
							{!projectName ? (
								<CheckIcon
									aria-hidden
									className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary'
								/>
							) : null}
						</DropdownMenuItem>
						{normalizedOptions.map((option, index) => (
							<DropdownMenuItem
								className='gap-2 p-2'
								key={option.id}
								onSelect={() => onSelectProject(option.id)}
							>
								<span className='min-w-0 flex-1 truncate'>{option.name}</span>
								<ShortcutMenuItemHint digit={digitShortcutMap[index + 1]?.digit ?? ''} />
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
