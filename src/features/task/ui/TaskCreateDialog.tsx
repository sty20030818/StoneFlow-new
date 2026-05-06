import { useState } from 'react'

import type { Scope, Space, TaskPlacement, TaskStatus } from '@/shared/types'
import type { ProjectOption } from '@/features/project/model/types'
import { getSpaceVisual } from '@/features/space/model/spaceVisuals'
import { TaskCreateModalContent } from '@/features/task/ui/TaskCreateModalContent'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/base/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { Button } from '@/shared/ui/base/button'
import { CheckIcon, ChevronRightIcon, Maximize2Icon, XIcon } from 'lucide-react'

type TaskCreateDialogProps = {
	open: boolean
	currentScope: Scope
	spaces: Space[]
	projects: ProjectOption[]
	projectsLoading: boolean
	initialPlacement: TaskPlacement | null
	initialProjectId: string | null
	initialStatus: TaskStatus
	onClose: () => void
}

/**
 * 任务创建弹窗 — Linear 风格。
 * Header: Space 下拉面包屑（副按钮）+ 最大化/关闭按钮，无分割线。
 */
export function TaskCreateDialog({
	open,
	currentScope,
	spaces,
	projects,
	projectsLoading,
	initialPlacement,
	initialProjectId,
	initialStatus,
	onClose,
}: TaskCreateDialogProps) {
	const defaultSpaceId =
		currentScope.type === 'space'
			? currentScope.spaceId
			: (spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? null)
	const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(defaultSpaceId)
	const currentSpace = selectedSpaceId
		? (spaces.find((space) => space.id === selectedSpaceId) ?? null)
		: null
	const currentSpaceLabel = currentSpace?.name ?? '全部 Spaces'

	return (
		<Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<DialogContent
				className='flex max-h-[85vh] max-w-[calc(100%-1.5rem)] flex-col gap-0 rounded-3xl border-(--sf-color-border-secondary) bg-popover p-0 shadow-(--sf-shadow-float) sm:max-w-2xl'
				showCloseButton={false}
			>
				<DialogTitle className='sr-only'>新建任务</DialogTitle>
				<DialogDescription className='sr-only'>
					创建新任务，设置标题、描述、状态、优先级与归属。
				</DialogDescription>

				{/* Header: 面包屑 + 操作按钮，无分割线 */}
				<div className='flex items-center justify-between p-4'>
					<div className='flex items-center gap-1 text-[13px]'>
						<SpaceDropdownMenu
							currentSpace={currentSpace}
							currentSpaceLabel={currentSpaceLabel}
							onSelectSpace={setSelectedSpaceId}
							selectedSpaceId={selectedSpaceId}
							spaces={spaces}
						/>
						<ChevronRightIcon className='size-3.5 text-(--sf-color-icon-subtle)' />
						<span className='font-black text-foreground'>新建任务</span>
					</div>

					<div className='flex items-center gap-0.5'>
						<Button
							className='size-7 text-(--sf-color-icon-secondary)'
							size='icon-sm'
							variant='ghost'
						>
							<Maximize2Icon className='size-3.5' />
						</Button>
						<Button
							className='size-7 text-(--sf-color-icon-secondary)'
							onClick={onClose}
							size='icon-sm'
							variant='ghost'
						>
							<XIcon className='size-3.5' />
						</Button>
					</div>
				</div>

				<TaskCreateModalContent
					currentScope={currentScope}
					initialPlacement={initialPlacement}
					initialProjectId={initialProjectId}
					initialSpaceId={selectedSpaceId}
					initialStatus={initialStatus}
					onClose={onClose}
					projects={projects}
					projectsLoading={projectsLoading}
					spaces={spaces}
				/>
			</DialogContent>
		</Dialog>
	)
}

/**
 * Space 下拉选择器 — 副按钮风格，space 自带 icon + 名称。
 */
function SpaceDropdownMenu({
	currentSpace,
	currentSpaceLabel,
	selectedSpaceId,
	spaces,
	onSelectSpace,
}: {
	currentSpace: Space | null
	currentSpaceLabel: string
	selectedSpaceId: string | null
	spaces: Space[]
	onSelectSpace: (spaceId: string | null) => void
}) {
	const visual = currentSpace ? getSpaceVisual(currentSpace) : null
	const SpaceIcon = visual?.icon

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button size='sm' variant='secondary'>
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
										className='ml-auto size-3.5 shrink-0 text-(--sf-color-icon-secondary)'
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
