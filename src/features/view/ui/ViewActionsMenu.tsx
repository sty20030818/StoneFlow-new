import type { View } from '@/shared/types'
import { Button } from '@/shared/ui/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { EllipsisIcon, EyeIcon, EyeOffIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'

type ViewActionsMenuProps = {
	activeView: View | null
	views: View[]
	onCreate: () => void
	onEdit: (view: View) => void
	onDelete: (view: View) => void
	onToggleVisible: (view: View, visible: boolean) => void
	onReorder: (orderedIds: string[]) => void
}

export function ViewActionsMenu({
	activeView,
	views,
	onCreate,
	onEdit,
	onDelete,
	onToggleVisible,
	onReorder,
}: ViewActionsMenuProps) {
	const hiddenViews = views.filter((view) => !view.isVisible)
	const visibleViews = views.filter((view) => view.isVisible)
	const activeVisibleIndex = activeView
		? visibleViews.findIndex((view) => view.id === activeView.id)
		: -1

	function moveActiveView(offset: -1 | 1) {
		if (!activeView || activeVisibleIndex < 0) {
			return
		}

		const targetIndex = activeVisibleIndex + offset
		if (targetIndex < 0 || targetIndex >= visibleViews.length) {
			return
		}

		const nextOrderedIds = visibleViews.map((view) => view.id)
		const [movedId] = nextOrderedIds.splice(activeVisibleIndex, 1)
		nextOrderedIds.splice(targetIndex, 0, movedId)
		onReorder(nextOrderedIds)
	}

	function stopSelect(event: Event) {
		event.preventDefault()
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button size='icon-sm' type='button' variant='outline'>
					<EllipsisIcon />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				<DropdownMenuGroup>
					<DropdownMenuItem
						onSelect={(event) => {
							stopSelect(event)
							onCreate()
						}}
					>
						<PlusIcon />
						新建自定义视图
					</DropdownMenuItem>
					{activeView?.type === 'custom' ? (
						<DropdownMenuItem
							onSelect={(event) => {
								stopSelect(event)
								onEdit(activeView)
							}}
						>
							<PencilIcon />
							编辑当前视图
						</DropdownMenuItem>
					) : null}
				</DropdownMenuGroup>

				{activeView ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem
								onSelect={(event) => {
									stopSelect(event)
									onToggleVisible(activeView, !activeView.isVisible)
								}}
							>
								{activeView.isVisible ? <EyeOffIcon /> : <EyeIcon />}
								{activeView.isVisible ? '隐藏当前视图' : '显示当前视图'}
							</DropdownMenuItem>
							<DropdownMenuItem
								disabled={activeVisibleIndex <= 0}
								onSelect={(event) => {
									stopSelect(event)
									moveActiveView(-1)
								}}
							>
								向前移动
							</DropdownMenuItem>
							<DropdownMenuItem
								disabled={activeVisibleIndex < 0 || activeVisibleIndex >= visibleViews.length - 1}
								onSelect={(event) => {
									stopSelect(event)
									moveActiveView(1)
								}}
							>
								向后移动
							</DropdownMenuItem>
							{activeView.type === 'custom' ? (
								<DropdownMenuItem
									onSelect={(event) => {
										stopSelect(event)
										onDelete(activeView)
									}}
									variant='destructive'
								>
									<Trash2Icon />
									删除当前视图
								</DropdownMenuItem>
							) : null}
						</DropdownMenuGroup>
					</>
				) : null}

				{hiddenViews.length > 0 ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuLabel>已隐藏视图</DropdownMenuLabel>
						<DropdownMenuGroup>
							{hiddenViews.map((view) => (
								<DropdownMenuItem
									key={view.id}
									onSelect={(event) => {
										stopSelect(event)
										onToggleVisible(view, true)
									}}
								>
									<EyeIcon />
									{view.name}
								</DropdownMenuItem>
							))}
						</DropdownMenuGroup>
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
