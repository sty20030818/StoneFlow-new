import { getSpaceVisual } from '@/features/space/model/spaceVisuals'
import type { Space } from '@/shared/types'
import { Button } from '@/shared/ui/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { CheckIcon } from 'lucide-react'

/**
 * Space 下拉选择器 — 副按钮风格，space 自带 icon + 名称。
 * 任务 / 项目创建等浮动弹窗顶栏复用。
 */
export function SpaceDropdownMenu({
	currentSpace,
	currentSpaceLabel,
	selectedSpaceId,
	spaces,
	onSelectSpace,
	disabled = false,
}: {
	currentSpace: Space | null
	currentSpaceLabel: string
	selectedSpaceId: string | null
	spaces: Space[]
	onSelectSpace: (spaceId: string | null) => void
	/** 为 true 时锁定当前 Space（例如在单一 Space 作用域下） */
	disabled?: boolean
}) {
	const visual = currentSpace ? getSpaceVisual(currentSpace) : null
	const SpaceIcon = visual?.icon

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button disabled={disabled} size='sm' variant='outline'>
					{SpaceIcon && currentSpace ? <SpaceIcon className={visual.iconClassName} /> : null}
					{currentSpaceLabel}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' sideOffset={6}>
				<DropdownMenuLabel>Space</DropdownMenuLabel>
				<DropdownMenuGroup>
					{spaces.map((space) => {
						const spaceVisual = getSpaceVisual(space)
						const Icon = spaceVisual.icon
						return (
							<DropdownMenuItem
								className='gap-2 p-2'
								key={space.id}
								onSelect={() => onSelectSpace(space.id)}
							>
								<Icon className={spaceVisual.iconClassName} />
								<span className='min-w-0 flex-1 truncate'>{space.name}</span>
								{selectedSpaceId === space.id ? (
									<CheckIcon
										aria-hidden
										className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary'
									/>
								) : null}
							</DropdownMenuItem>
						)
					})}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
