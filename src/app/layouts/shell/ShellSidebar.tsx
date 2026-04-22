import { NavLink } from 'react-router-dom'

import { SHELL_NAV_ITEMS, SHELL_SPACES, type ShellProjectLink } from '@/app/layouts/shell/config'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { cn } from '@/shared/lib/utils'
import { getProjectStatusBadgeVariant } from '@/shared/ui/badgeSemantics'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { PlusIcon } from 'lucide-react'

type ShellSidebarProps = {
	currentSpaceId: string
	projects: ShellProjectLink[]
	isProjectsLoading: boolean
	projectsError: string | null
	onOpenProjectCreateDialog: (parentProjectId?: string | null) => void
	onRefreshProjects?: () => void
}

export function ShellSidebar({
	currentSpaceId,
	projects,
	isProjectsLoading,
	projectsError,
	onOpenProjectCreateDialog,
	onRefreshProjects = () => undefined,
}: ShellSidebarProps) {
	return (
		<aside className='flex h-full w-(--sf-shell-sidebar-width) shrink-0 flex-col bg-(--sf-color-shell-chrome)'>
			<div className='px-1.5 pb-4 pt-1.5'>
				<div className='flex gap-1 rounded-lg p-1'>
					{SHELL_SPACES.map((space) => (
						<NavLink
							className={({ isActive }) =>
								cn(
									'flex h-6 flex-1 items-center justify-center rounded-md border border-transparent text-[12px] font-medium transition-colors',
									isActive
										? 'border-(--sf-color-border-subtle) bg-card text-foreground shadow-(--sf-shadow-panel)'
										: 'text-muted-foreground hover:bg-(--sf-color-shell-hover) hover:text-foreground',
								)
							}
							key={space.id}
							to={`/space/${space.id}/inbox`}
						>
							{space.label}
						</NavLink>
					))}
				</div>
			</div>

			<div className='no-scrollbar flex-1 overflow-y-auto pb-4'>
				<nav className='space-y-0.5 px-1.5'>
					{SHELL_NAV_ITEMS.map((item) => (
						<NavLink
							className={({ isActive }) =>
								cn(
									'flex h-8 items-center gap-2 rounded-md border border-transparent px-2.5 text-[13px] transition-colors',
									isActive
										? 'border-(--sf-color-border-subtle) bg-card font-medium text-foreground shadow-(--sf-shadow-panel)'
										: 'text-(--sf-color-shell-secondary) hover:bg-(--sf-color-shell-hover) hover:text-foreground',
								)
							}
							key={item.key}
							to={item.to(currentSpaceId)}
						>
							<item.icon className='size-3.5 shrink-0' />
							<span>{item.label}</span>
							{item.badge ? (
								<Badge className='ml-auto rounded-full px-1.5 py-0 text-[10px]' variant='outline'>
									{item.badge}
								</Badge>
							) : null}
						</NavLink>
					))}
				</nav>

				<section className='space-y-1 px-1.5'>
					<div className='flex items-center justify-between px-2.5'>
						<p className='text-[10.5px] font-medium tracking-[0.06em] text-(--sf-color-shell-tertiary) uppercase'>
							Projects
						</p>
						<Button
							aria-label='创建项目'
							className='rounded-md text-(--sf-color-shell-secondary) hover:bg-(--sf-color-shell-hover) hover:text-foreground'
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
									<PlusIcon data-icon='inline-start' />
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
													? 'border-(--sf-color-border-subtle) bg-card font-medium text-foreground shadow-(--sf-shadow-panel)'
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
										className='size-7 shrink-0 rounded-md text-(--sf-color-shell-secondary) opacity-0 transition-opacity group-hover:opacity-100 hover:bg-(--sf-color-shell-hover) hover:text-foreground focus-visible:opacity-100'
										onClick={() => onOpenProjectCreateDialog(project.id)}
										size='icon-xs'
										variant='ghost'
									>
										<PlusIcon />
									</Button>
								</div>
								{project.children?.map((childProject) => (
									<NavLink
										className={({ isActive }) =>
											cn(
												'ml-5 flex h-7 items-center gap-2 rounded-md border border-transparent px-2 text-[12px] transition-colors',
												isActive
													? 'border-(--sf-color-border-subtle) bg-card font-medium text-foreground shadow-(--sf-shadow-panel)'
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
