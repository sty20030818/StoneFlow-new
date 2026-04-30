import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { buildScopedSectionPath, getScopeLabel } from '@/app/layouts/shell/config'
import {
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import type { ProjectDetail } from '@/features/project/model/types'
import { selectProjectDetail, useProjectStore } from '@/features/project/model/useProjectStore'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/shared/ui/base/breadcrumb'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import { Input } from '@/shared/ui/base/input'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { Textarea } from '@/shared/ui/base/textarea'
import { FolderIcon, ListTodoIcon } from 'lucide-react'

export function ProjectPage() {
	const navigate = useNavigate()
	const { projectId = '' } = useParams()
	const { scope, spaceId } = useScopeRoute()
	const spaces = useSpaceStore(selectSpaces)
	const detail = useProjectStore(selectProjectDetail)
	const loadDetail = useProjectStore((state) => state.loadDetail)
	const clearDetail = useProjectStore((state) => state.clearDetail)
	const updateProject = useProjectStore((state) => state.updateProject)
	const completeProject = useProjectStore((state) => state.completeProject)
	const reopenProject = useProjectStore((state) => state.reopenProject)
	const archiveProject = useProjectStore((state) => state.archiveProject)
	const deleteProject = useProjectStore((state) => state.deleteProject)
	const [isEditing, setIsEditing] = useState(false)
	const [draftName, setDraftName] = useState('')
	const [draftDescription, setDraftDescription] = useState('')
	const [draftDueAt, setDraftDueAt] = useState('')
	const [busyAction, setBusyAction] = useState<string | null>(null)

	useEffect(() => {
		if (projectId) {
			void loadDetail(projectId)
		}
		return () => {
			clearDetail()
		}
	}, [clearDetail, loadDetail, projectId])

	useEffect(() => {
		if (!detail.item) {
			return
		}
		setDraftName(detail.item.name)
		setDraftDescription(detail.item.description ?? '')
		setDraftDueAt(detail.item.dueAt ?? '')
	}, [detail.item])

	async function runAction(action: string, runner: () => Promise<unknown>) {
		setBusyAction(action)
		try {
			await runner()
		} finally {
			setBusyAction(null)
		}
	}

	async function handleSave(project: ProjectDetail) {
		await runAction('save', async () => {
			await updateProject({
				projectId: project.id,
				name: draftName,
				description: draftDescription || null,
				dueAt: draftDueAt || null,
			})
			setIsEditing(false)
		})
	}

	const project = detail.item

	return (
		<MainCardLayout
			header={
				<MainCardHeader
					breadcrumb={<ProjectBreadcrumb projectName={project?.name ?? 'Project'} />}
					action={
						project ? (
							<div className='flex items-center gap-2'>
								<Button
									disabled={busyAction !== null}
									onClick={() => setIsEditing((current) => !current)}
									size='sm'
									variant='outline'
								>
									{isEditing ? '取消编辑' : '编辑'}
								</Button>
								<Button
									disabled={busyAction !== null}
									onClick={() => {
										void runAction(project.completedAt ? 'reopen' : 'complete', async () => {
											if (project.completedAt) {
												await reopenProject(project.id)
												return
											}
											await completeProject(project.id)
										})
									}}
									size='sm'
									variant='outline'
								>
									{project.completedAt ? '重开' : '完成'}
								</Button>
								<Button
									disabled={busyAction !== null}
									onClick={() => {
										void runAction('archive', async () => {
											await archiveProject(project.id)
											navigate(buildScopedSectionPath(scope, 'projects', spaceId))
										})
									}}
									size='sm'
									variant='outline'
								>
									归档
								</Button>
								<Button
									disabled={busyAction !== null}
									onClick={() => {
										void runAction('delete', async () => {
											await deleteProject(project.id)
											navigate(buildScopedSectionPath(scope, 'projects', spaceId))
										})
									}}
									size='sm'
									variant='outline'
								>
									删除
								</Button>
							</div>
						) : null
					}
				/>
			}
			toolbar={
				<MainCardToolbar
					left={
						project ? (
							<div className='flex flex-wrap items-center gap-2 text-[12px] text-(--sf-color-shell-secondary)'>
								<Badge variant='secondary'>{project.activeTaskCount} active</Badge>
								<Badge variant='outline'>{project.taskCount} tasks</Badge>
								{project.dueAt ? <Badge variant='outline'>Due {project.dueAt}</Badge> : null}
								{project.completedAt ? <Badge variant='success'>Completed</Badge> : null}
							</div>
						) : undefined
					}
					onRefresh={() => {
						if (projectId) {
							void loadDetail(projectId)
						}
					}}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col gap-3'>
				{detail.error ? (
					<StatusNotice role='alert' size='sm' variant='danger'>
						{detail.error}
					</StatusNotice>
				) : (
					<StatusNotice size='sm'>
						当前 Scope：{getScopeLabel(scope, spaces)}。Project Detail 已接入真实后端，Task
						区域仍保留阶段 6 占位。
					</StatusNotice>
				)}

				{!project ? (
					<EmptyPage>
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<FolderIcon />
								</EmptyMedia>
								<EmptyTitle>当前 Project 不可见</EmptyTitle>
								<EmptyDescription>它可能已被归档、删除，或当前 Scope 已切走。</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button
									onClick={() => navigate(buildScopedSectionPath(scope, 'projects', spaceId))}
									type='button'
								>
									返回 Project Overview
								</Button>
							</EmptyContent>
						</Empty>
					</EmptyPage>
				) : (
					<>
						<ProjectDetailCard
							draftDescription={draftDescription}
							draftDueAt={draftDueAt}
							draftName={draftName}
							isBusy={busyAction !== null}
							isEditing={isEditing}
							onChangeDescription={setDraftDescription}
							onChangeDueAt={setDraftDueAt}
							onChangeName={setDraftName}
							onSave={() => {
								void handleSave(project)
							}}
							project={project}
						/>

						<ProjectTaskPlaceholder />
					</>
				)}
			</div>
		</MainCardLayout>
	)
}

function ProjectBreadcrumb({ projectName }: { projectName: string }) {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<span className='inline-flex items-center gap-1.5 text-foreground'>
						<FolderIcon aria-hidden className='size-4 shrink-0 text-(--sf-color-text-tertiary)' />
						Projects
					</span>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem className='min-w-0'>
					<BreadcrumbPage className='truncate'>{projectName}</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}

type ProjectDetailCardProps = {
	project: ProjectDetail
	isEditing: boolean
	isBusy: boolean
	draftName: string
	draftDescription: string
	draftDueAt: string
	onChangeName: (value: string) => void
	onChangeDescription: (value: string) => void
	onChangeDueAt: (value: string) => void
	onSave: () => void
}

function ProjectDetailCard({
	project,
	isEditing,
	isBusy,
	draftName,
	draftDescription,
	draftDueAt,
	onChangeName,
	onChangeDescription,
	onChangeDueAt,
	onSave,
}: ProjectDetailCardProps) {
	return (
		<div className='rounded-[28px] border border-(--sf-color-border-subtle) bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]'>
			<div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]'>
				<div className='space-y-4'>
					<div className='space-y-1.5'>
						<p className='text-[11px] font-medium tracking-[0.06em] text-(--sf-color-shell-tertiary) uppercase'>
							Project
						</p>
						{isEditing ? (
							<Input
								className='h-11 rounded-md border-input bg-card'
								disabled={isBusy}
								onChange={(event) => onChangeName(event.currentTarget.value)}
								value={draftName}
							/>
						) : (
							<h2 className='text-[24px] font-semibold tracking-[-0.03em] text-foreground'>
								{project.name}
							</h2>
						)}
					</div>

					<div className='space-y-1.5'>
						<p className='text-[11px] font-medium tracking-[0.06em] text-(--sf-color-shell-tertiary) uppercase'>
							Description
						</p>
						{isEditing ? (
							<Textarea
								className='min-h-28 rounded-md border-input bg-card'
								disabled={isBusy}
								onChange={(event) => onChangeDescription(event.currentTarget.value)}
								value={draftDescription}
							/>
						) : (
							<p className='text-[14px] leading-7 text-(--sf-color-shell-secondary)'>
								{project.description ?? '当前还没有项目说明。'}
							</p>
						)}
					</div>

					{isEditing ? (
						<div className='flex justify-end'>
							<Button disabled={isBusy || draftName.trim().length === 0} onClick={onSave} size='sm'>
								{isBusy ? '保存中...' : '保存修改'}
							</Button>
						</div>
					) : null}
				</div>

				<div className='rounded-[24px] border border-(--sf-color-border-subtle) bg-(--sf-color-bg-surface-muted) p-4'>
					<p className='text-[11px] font-medium tracking-[0.06em] text-(--sf-color-shell-tertiary) uppercase'>
						Meta
					</p>
					<div className='mt-3 grid gap-3 text-[13px] text-(--sf-color-shell-secondary)'>
						<div>
							<p className='text-[11px] uppercase tracking-[0.06em] text-(--sf-color-shell-tertiary)'>
								Space
							</p>
							<p className='mt-1'>{project.spaceName}</p>
						</div>
						<div>
							<p className='text-[11px] uppercase tracking-[0.06em] text-(--sf-color-shell-tertiary)'>
								Due At
							</p>
							{isEditing ? (
								<Input
									className='mt-1 h-10 rounded-md border-input bg-white'
									disabled={isBusy}
									onChange={(event) => onChangeDueAt(event.currentTarget.value)}
									value={draftDueAt}
								/>
							) : (
								<p className='mt-1'>{project.dueAt ?? '未设置'}</p>
							)}
						</div>
						<div>
							<p className='text-[11px] uppercase tracking-[0.06em] text-(--sf-color-shell-tertiary)'>
								Updated
							</p>
							<p className='mt-1'>{project.updatedAt}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

function ProjectTaskPlaceholder() {
	return (
		<div className='rounded-[28px] border border-dashed border-(--sf-color-border-subtle) bg-white/70 p-6'>
			<div className='flex items-start gap-3'>
				<span className='mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-(--sf-color-bg-surface-muted) text-(--sf-color-shell-secondary)'>
					<ListTodoIcon className='size-4' />
				</span>
				<div className='space-y-2'>
					<h3 className='text-[15px] font-semibold text-foreground'>Task List 将在阶段 6 接入</h3>
					<p className='max-w-2xl text-[13px] leading-6 text-(--sf-color-shell-secondary)'>
						当前阶段只交付真实 Project Detail 与项目生命周期，任务列表、任务编辑和 Drawer
						读写仍保持阶段 6 占位，不提前把 Task CRUD 混进来。
					</p>
				</div>
			</div>
		</div>
	)
}
