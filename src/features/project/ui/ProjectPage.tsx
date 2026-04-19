import { useParams } from 'react-router-dom'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { ListItem } from '@/shared/ui/ListItem'
import { PanelSurface } from '@/shared/ui/PanelSurface'
import { MoreHorizontalIcon } from 'lucide-react'

const groupedTasks = [
	{
		id: 'task-project-shell-refactor',
		title: '重组 Header / Sidebar / Footer',
		description: '让标题栏、搜索、新建、Sidebar、Footer 与 Drawer 的边界回到清晰状态。',
		status: 'Todo',
	},
	{
		id: 'task-project-sidebar-polish',
		title: '把 Sidebar 做成连续导航带',
		description: '同时承接 Space、主导航和静态 Projects，而不是继续停留在 demo 链接层。',
		status: 'Doing',
	},
	{
		id: 'task-project-drawer-sections',
		title: '把 Drawer 的分区做清楚',
		description: '摘要区、资源区和元信息区要像精密面板，而不是厚重卡片堆。',
		status: 'Ready',
	},
]

export function ProjectPage() {
	const { projectId = 'stoneflow-v1' } = useParams()
	const openDrawer = useShellLayoutStore((state) => state.openDrawer)

	return (
		<div className='flex flex-col gap-5 p-4'>
			<PanelSurface
				actions={
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button className='rounded-xl' size='icon-sm' variant='outline'>
								<MoreHorizontalIcon />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end'>
							<DropdownMenuGroup>
								<DropdownMenuItem onSelect={() => openDrawer('project', projectId)}>
									打开项目摘要
								</DropdownMenuItem>
								<DropdownMenuItem>查看项目备注</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuItem variant='destructive'>归档预览</DropdownMenuItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				}
				eyebrow='Project'
				title={`项目工作区 · ${projectId}`}
			>
				<div className='flex flex-wrap items-center gap-2'>
					<Badge>Active</Badge>
					<Badge variant='outline'>6 tasks</Badge>
					<Badge variant='secondary'>今天 17:40</Badge>
					<Button
						className='rounded-xl'
						onClick={() => openDrawer('project', projectId)}
						size='sm'
						variant='outline'
					>
						查看详情
					</Button>
				</div>
			</PanelSurface>

			<PanelSurface eyebrow='Grouped Tasks' title='按状态分组'>
				<div className='flex flex-col gap-3'>
					{groupedTasks.map((task) => (
						<ListItem
							key={task.id}
							description={task.description}
							onClick={() => openDrawer('task', task.id)}
							title={task.title}
							trailing={<Badge variant='secondary'>{task.status}</Badge>}
						/>
					))}
				</div>
			</PanelSurface>
		</div>
	)
}
