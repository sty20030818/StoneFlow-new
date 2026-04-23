import { NavLink, useNavigate } from 'react-router-dom'

import { SHELL_NAV_ITEMS, SHELL_SPACES, type ShellProjectLink } from '@/app/layouts/shell/config'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { cn } from '@/shared/lib/utils'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { getProjectStatusBadgeVariant } from '@/shared/ui/badgeSemantics'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { CheckIcon, ChevronDownIcon, SquarePenIcon, PlusIcon } from 'lucide-react'
import type { ShellNavBadges } from '@/app/layouts/shell/model/useShellNavBadges'

type ShellSidebarProps = {
	currentSpaceId: string
	projects: ShellProjectLink[]
	isProjectsLoading: boolean
	projectsError: string | null
	navBadges?: ShellNavBadges
	onOpenTaskCreateDialog: () => void
	onOpenProjectCreateDialog: (parentProjectId?: string | null) => void
	onRefreshProjects?: () => void
}

export function ShellSidebar({
	currentSpaceId,
	projects,
	isProjectsLoading,
	projectsError,
	navBadges = {},
	onOpenTaskCreateDialog,
	onOpenProjectCreateDialog,
	onRefreshProjects = () => undefined,
}: ShellSidebarProps) {
	const navigate = useNavigate()
	const activeSpace = SHELL_SPACES.find((space) => space.id === currentSpaceId) ?? SHELL_SPACES[0]
	const ActiveSpaceIcon = activeSpace.icon

	return (
		<aside className='flex h-full w-(--sf-shell-sidebar-width) shrink-0 flex-col bg-(--sf-color-shell-chrome)'>
			<div className='flex items-center gap-1.5 px-5.5 pb-4 pt-2'>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							aria-label='切换 Space'
							className='h-8 w-29.5 justify-start gap-1.5 rounded-md border-transparent bg-transparent px-2 text-[13px] text-foreground shadow-none hover:bg-(--sf-color-shell-hover) aria-expanded:bg-(--sf-color-shell-hover)'
							size='default'
							variant='ghost'
						>
							<ActiveSpaceIcon className={cn('size-3.5 shrink-0', activeSpace.iconClassName)} />
							<span className='min-w-0 flex-1 truncate text-left font-medium'>
								{activeSpace.label}
							</span>
							<ChevronDownIcon className='size-3 shrink-0 text-(--sf-color-icon-subtle)' />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='start' className='w-44'>
						<DropdownMenuGroup>
							{SHELL_SPACES.map((space) => {
								const SpaceIcon = space.icon
								const isActive = space.id === activeSpace.id

								return (
									<DropdownMenuItem
										key={space.id}
										onSelect={() => {
											navigate(`/space/${space.id}/inbox`)
										}}
									>
										<SpaceIcon className={cn('size-3.5', space.iconClassName)} />
										<span>{space.label}</span>
										{isActive ? (
											<CheckIcon className='ml-auto size-3.5 text-(--sf-color-icon-secondary)' />
										) : null}
									</DropdownMenuItem>
								)
							})}
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
				<Button
					aria-label='新建任务'
					className='ml-auto'
					onClick={onOpenTaskCreateDialog}
					size='icon'
					variant='secondary'
				>
					<SquarePenIcon />
				</Button>
			</div>

			<div className='no-scrollbar flex-1 overflow-y-auto pb-4'>
				<nav className='space-y-0.5 px-5.5'>
					{SHELL_NAV_ITEMS.map((item) => {
						const badge = navBadges[item.key]

						return (
							<NavLink
								className={({ isActive }) =>
									cn(
										'flex h-8 items-center gap-2 rounded-md border border-transparent px-2.5 text-[13px] transition-colors',
										isActive
											? 'border-(--sf-color-border-subtle) bg-sidebar-accent font-medium text-foreground shadow-(--sf-shadow-panel)'
											: 'text-(--sf-color-shell-secondary) hover:bg-(--sf-color-shell-hover) hover:text-foreground',
									)
								}
								key={item.key}
								to={item.to(currentSpaceId)}
							>
								<item.icon className='size-3.5 shrink-0' />
								<span>{item.label}</span>
								{badge ? (
									<span className='ml-auto text-[12px] font-semibold text-(--sf-color-shell-secondary)'>
										{badge}
									</span>
								) : null}
							</NavLink>
						)
					})}
				</nav>

				<section className='space-y-1 px-5.5'>
					<div className='flex items-center justify-between px-2.5'>
						<p className='text-[10.5px] font-medium tracking-[0.06em] text-(--sf-color-shell-tertiary) uppercase'>
							Projects
						</p>
						<Button
							aria-label='创建项目'
							onClick={() => onOpenProjectCreateDialog()}
							size='icon-xs'
							variant='ghost'
						>
							<PlusIcon />
						</Button>
					</div>
					{isProjectsLoading ? (
						<StatusNotice className='text-[12px]' size='sm'>
							正在加载项目...
						</StatusNotice>
					) : projectsError ? (
						<StatusNotice
							actions={
								<Button
									className='h-7 rounded-md px-2 text-[12px]'
									onClick={onRefreshProjects}
									size='sm'
									variant='outline'
								>
									重试加载
								</Button>
							}
							className='text-[12px]'
							size='sm'
							variant='danger'
						>
							<p className='leading-5'>{projectsError}</p>
						</StatusNotice>
					) : projects.length === 0 ? (
						<StatusNotice
							actions={
								<Button
									className='justify-start rounded-md'
									onClick={() => onOpenProjectCreateDialog()}
									size='sm'
								>
									创建第一个项目
								</Button>
							}
							className='text-[12px]'
							size='sm'
							title='当前 Space 还没有项目'
						/>
					) : (
						projects.map((project) => (
							<div className='space-y-0.5' key={project.id}>
								<div className='group flex items-center gap-1'>
									<NavLink
										className={({ isActive }) =>
											cn(
												'flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-transparent px-2.5 text-[13px] transition-colors',
												isActive
													? 'border-(--sf-color-border-subtle) bg-sidebar-accent font-medium text-foreground shadow-(--sf-shadow-panel)'
													: 'text-(--sf-color-shell-secondary) hover:bg-(--sf-color-shell-hover) hover:text-foreground',
											)
										}
										to={`/space/${currentSpaceId}/project/${project.id}`}
									>
										<span className='size-3 shrink-0 rounded-full bg-(--sf-color-border-strong)' />
										<span className='min-w-0 truncate'>{project.label}</span>
										{project.badge ? (
											<Badge
												className='ml-auto h-4 shrink-0 rounded-md px-1.5 text-[10.5px]'
												variant={getProjectStatusBadgeVariant(project.badge)}
											>
												{project.badge}
											</Badge>
										) : null}
									</NavLink>
									<Button
										aria-label={`在 ${project.label} 下创建子项目`}
										className='shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100'
										onClick={() => onOpenProjectCreateDialog(project.id)}
										size='icon-xs'
										variant='ghost'
									>
										<SquarePenIcon />
									</Button>
								</div>
								{project.children?.map((childProject) => (
									<NavLink
										className={({ isActive }) =>
											cn(
												'ml-5 flex h-7 items-center gap-2 rounded-md border border-transparent px-2 text-[12px] transition-colors',
												isActive
													? 'border-(--sf-color-border-subtle) bg-sidebar-accent font-medium text-foreground shadow-(--sf-shadow-panel)'
													: 'text-(--sf-color-shell-secondary) hover:bg-(--sf-color-shell-hover) hover:text-foreground',
											)
										}
										key={childProject.id}
										to={`/space/${currentSpaceId}/project/${childProject.id}`}
									>
										<span className='size-2 shrink-0 rounded-full bg-(--sf-color-border-strong)' />
										<span className='min-w-0 truncate'>{childProject.label}</span>
										{childProject.badge ? (
											<Badge
												className='ml-auto h-4 shrink-0 rounded-md px-1.5 text-[10.5px]'
												variant={getProjectStatusBadgeVariant(childProject.badge)}
											>
												{childProject.badge}
											</Badge>
										) : null}
									</NavLink>
								))}
							</div>
						))
					)}
				</section>
			</div>
		</aside>
	)
}
