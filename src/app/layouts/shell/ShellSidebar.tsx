import { NavLink } from 'react-router-dom'

import { SHELL_NAV_ITEMS, SHELL_SPACES, type ShellProjectLink } from '@/app/layouts/shell/config'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { cn } from '@/shared/lib/utils'
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
				<div className='flex gap-1 rounded-xl p-1'>
					{SHELL_SPACES.map((space) => (
						<NavLink
							className={({ isActive }) =>
								cn(
									'flex h-6 flex-1 items-center justify-center rounded-[0.375rem] text-[12px] font-medium transition-colors',
									isActive
										? 'bg-black/10 text-foreground'
										: 'text-muted-foreground hover:bg-black/5 hover:text-foreground',
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
									'flex h-8 items-center gap-2 rounded-xl px-2.5 text-[13px] transition-colors',
									isActive
										? 'bg-black/9 font-medium text-foreground'
										: 'text-(--sf-color-shell-secondary) hover:bg-black/5 hover:text-foreground',
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
						<p className='text-[11px] font-medium tracking-[0.04em] text-(--sf-color-shell-tertiary)'>
							Projects
						</p>
						<Button
							aria-label='创建项目'
							className='rounded-[0.5rem] text-(--sf-color-shell-secondary)'
							onClick={() => onOpenProjectCreateDialog()}
							size='icon-xs'
							variant='ghost'
						>
							<PlusIcon />
						</Button>
					</div>
					{isProjectsLoading ? (
						<p className='px-2.5 py-1 text-[12px] text-(--sf-color-shell-tertiary)'>
							正在加载项目...
						</p>
					) : projectsError ? (
						<div className='space-y-2 px-2.5 py-1'>
							<p className='text-[12px] leading-5 text-destructive'>{projectsError}</p>
							<Button
								className='h-7 rounded-lg px-2 text-[12px]'
								onClick={onRefreshProjects}
								size='sm'
								variant='outline'
							>
								重试加载
							</Button>
						</div>
					) : projects.length === 0 ? (
						<div className='flex flex-col gap-2 px-2.5 py-1'>
							<p className='text-[12px] text-(--sf-color-shell-tertiary)'>当前 Space 还没有项目</p>
							<Button
								className='justify-start rounded-xl'
								onClick={() => onOpenProjectCreateDialog()}
								size='sm'
							>
								<PlusIcon data-icon='inline-start' />
								创建第一个项目
							</Button>
						</div>
					) : (
						projects.map((project) => (
							<div className='space-y-0.5' key={project.id}>
								<div className='group flex items-center gap-1'>
									<NavLink
										className={({ isActive }) =>
											cn(
												'flex h-8 min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 text-[13px] transition-colors',
												isActive
													? 'bg-black/9 font-medium text-foreground'
													: 'text-(--sf-color-shell-secondary) hover:bg-black/5 hover:text-foreground',
											)
										}
										to={`/space/${currentSpaceId}/project/${project.id}`}
									>
										<span className='size-3 shrink-0 rounded-lg bg-black/12' />
										<span className='min-w-0 truncate'>{project.label}</span>
										{project.badge ? (
											<span className='ml-auto shrink-0 text-[10px] text-(--sf-color-shell-tertiary)'>
												{project.badge}
											</span>
										) : null}
									</NavLink>
									<Button
										aria-label={`在 ${project.label} 下创建子项目`}
										className='size-7 shrink-0 rounded-[0.5rem] text-(--sf-color-shell-secondary) opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100'
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
												'ml-5 flex h-7 items-center gap-2 rounded-lg px-2 text-[12px] transition-colors',
												isActive
													? 'bg-black/9 font-medium text-foreground'
													: 'text-(--sf-color-shell-secondary) hover:bg-black/5 hover:text-foreground',
											)
										}
										key={childProject.id}
										to={`/space/${currentSpaceId}/project/${childProject.id}`}
									>
										<span className='size-2 shrink-0 rounded-full bg-black/16' />
										<span className='min-w-0 truncate'>{childProject.label}</span>
										{childProject.badge ? (
											<span className='ml-auto shrink-0 text-[10px] text-(--sf-color-shell-tertiary)'>
												{childProject.badge}
											</span>
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
