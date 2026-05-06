import { useEffect, useMemo, useState } from 'react'

import { ProjectCreateModalContent } from '@/features/project/ui/ProjectCreateModalContent'
import { SpaceDropdownMenu } from '@/features/space/ui/SpaceDropdownMenu'
import type { Scope, Space } from '@/shared/types'
import { cn } from '@/shared/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/base/dialog'
import { Button } from '@/shared/ui/base/button'
import { dialogShellFloatingBaseClass } from '@/shared/ui/patterns/dialog-shell'
import { ChevronRightIcon, Maximize2Icon, XIcon } from 'lucide-react'

type ProjectCreateDialogProps = {
	open: boolean
	currentScope: Scope
	spaces: Space[]
	onClose: () => void
}

/**
 * 项目创建弹窗 — 与任务创建弹窗同一套浮动壳层与顶栏结构。
 * Space 默认同当前作用域，顶栏下拉可随时改选。
 */
export function ProjectCreateDialog({ open, currentScope, spaces, onClose }: ProjectCreateDialogProps) {
	const defaultSpaceId = useMemo(
		() =>
			currentScope.type === 'space'
				? currentScope.spaceId
				: (spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? null),
		[currentScope, spaces],
	)
	const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(defaultSpaceId)

	useEffect(() => {
		if (!open) {
			return
		}
		setSelectedSpaceId(defaultSpaceId)
	}, [open, defaultSpaceId])
	const currentSpace = selectedSpaceId
		? (spaces.find((space) => space.id === selectedSpaceId) ?? null)
		: null
	const currentSpaceLabel = currentSpace?.name ?? '全部 Spaces'

	return (
		<Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<DialogContent
				className={cn(
					'flex max-h-[70dvh] min-h-0 max-w-[calc(100%-1.5rem+8px)] flex-col gap-0 overflow-hidden rounded-3xl border border-border sm:max-w-3xl top-[15dvh] translate-y-0',
					dialogShellFloatingBaseClass,
				)}
				showCloseButton={false}
			>
				<DialogTitle className='sr-only'>新建项目</DialogTitle>
				<DialogDescription className='sr-only'>
					在目标 Space 中创建新项目，填写名称与说明。
				</DialogDescription>

				<div className='flex shrink-0 items-center justify-between p-3'>
					<div className='flex items-center gap-1 text-[13px]'>
						<SpaceDropdownMenu
							currentSpace={currentSpace}
							currentSpaceLabel={currentSpaceLabel}
							onSelectSpace={setSelectedSpaceId}
							selectedSpaceId={selectedSpaceId}
							spaces={spaces}
						/>
						<ChevronRightIcon className='size-3.5 text-sf-icon-subtle' />
						<span className='font-black text-foreground'>新建项目</span>
					</div>

					<div className='flex items-center gap-0.5'>
						<Button className='size-7 text-sf-icon-secondary' size='icon-sm' variant='ghost'>
							<Maximize2Icon className='size-3.5' />
						</Button>
						<Button
							className='size-7 text-sf-icon-secondary'
							onClick={onClose}
							size='icon-sm'
							variant='ghost'
						>
							<XIcon className='size-3.5' />
						</Button>
					</div>
				</div>

				<div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
					<ProjectCreateModalContent onClose={onClose} selectedSpaceId={selectedSpaceId} />
				</div>
			</DialogContent>
		</Dialog>
	)
}
