import { useEffect, useMemo, useState } from 'react'

import {
	type ActivityTimelineEntry,
	getEntityActivities,
} from '@/features/activity/api/getEntityActivities'
import { TASK_PRIORITY_OPTIONS } from '@/features/task/model/taskPriority'
import { TASK_STATUS_OPTIONS } from '@/features/task/model/taskStatus'
import { selectTaskDetail, useTaskStore } from '@/features/task/model/useTaskStore'
import { selectProjectOptions, useProjectStore } from '@/features/project/model/useProjectStore'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import { Button } from '@/shared/ui/base/button'
import { Input } from '@/shared/ui/base/input'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/base/select'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/base/tabs'
import { Textarea } from '@/shared/ui/base/textarea'

type TaskDrawerContentProps = {
	currentSpaceLabel: string
	taskId: string
	onClose: () => void
}

type TaskDraft = {
	title: string
	note: string
	status: string
	priority: number
	spaceId: string
	projectId: string
	dueAt: string
	scheduledAt: string
	reminderAt: string
}

const EMPTY_PROJECT_VALUE = '__task-drawer-project-empty__'
const DRAWER_FIELD_CLASS = 'rounded-md border-input bg-card'
const DRAWER_SECTION_CLASS = 'rounded-lg border border-(--sf-color-border-subtle) bg-muted/35'
const DRAWER_SECTION_TITLE_CLASS =
	'text-[11px] font-medium tracking-[0.06em] text-(--sf-color-shell-tertiary) uppercase'

export function TaskDrawerContent({ currentSpaceLabel, taskId, onClose }: TaskDrawerContentProps) {
	const detail = useTaskStore(selectTaskDetail)
	const loadDetail = useTaskStore((state) => state.loadDetail)
	const clearDetail = useTaskStore((state) => state.clearDetail)
	const updateTask = useTaskStore((state) => state.updateTask)
	const archiveTask = useTaskStore((state) => state.archiveTask)
	const restoreTask = useTaskStore((state) => state.restoreTask)
	const spaces = useSpaceStore(selectSpaces)
	const projects = useProjectStore(selectProjectOptions)
	const [draft, setDraft] = useState<TaskDraft | null>(null)
	const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle')
	const [saveMessage, setSaveMessage] = useState<string | null>(null)
	const [activityEntries, setActivityEntries] = useState<ActivityTimelineEntry[]>([])
	const [activityStatus, setActivityStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
		'idle',
	)

	useEffect(() => {
		void loadDetail(taskId)
		return () => {
			clearDetail()
		}
	}, [clearDetail, loadDetail, taskId])

	useEffect(() => {
		if (!detail.item || detail.item.id !== taskId) {
			return
		}

		setDraft({
			title: detail.item.title,
			note: detail.item.note ?? '',
			status: detail.item.status,
			priority: detail.item.priority,
			spaceId: detail.item.spaceId,
			projectId: detail.item.projectId ?? '',
			dueAt: detail.item.dueAt ?? '',
			scheduledAt: detail.item.scheduledAt ?? '',
			reminderAt: detail.item.reminderAt ?? '',
		})
		setSaveStatus('idle')
		setSaveMessage(null)
	}, [detail.item, taskId])

	useEffect(() => {
		let cancelled = false
		setActivityStatus('loading')

		void getEntityActivities({
			entityType: 'task',
			entityId: taskId,
			limit: 30,
		})
			.then((entries) => {
				if (cancelled) {
					return
				}
				setActivityEntries(entries)
				setActivityStatus('ready')
			})
			.catch(() => {
				if (cancelled) {
					return
				}
				setActivityEntries([])
				setActivityStatus('error')
			})

		return () => {
			cancelled = true
		}
	}, [taskId])

	const visibleProjects = useMemo(() => {
		if (!draft?.spaceId) {
			return projects
		}
		return projects.filter((project) => project.spaceId === draft.spaceId)
	}, [draft?.spaceId, projects])

	const isDirty =
		detail.item && draft
			? JSON.stringify({
					title: draft.title.trim(),
					note: draft.note.trim() || null,
					status: draft.status,
					priority: draft.priority,
					spaceId: draft.spaceId,
					projectId: draft.projectId || null,
					dueAt: draft.dueAt.trim() || null,
					scheduledAt: draft.scheduledAt.trim() || null,
					reminderAt: draft.reminderAt.trim() || null,
				}) !==
				JSON.stringify({
					title: detail.item.title,
					note: detail.item.note,
					status: detail.item.status,
					priority: detail.item.priority,
					spaceId: detail.item.spaceId,
					projectId: detail.item.projectId,
					dueAt: detail.item.dueAt,
					scheduledAt: detail.item.scheduledAt,
					reminderAt: detail.item.reminderAt,
				})
			: false

	async function handleSave() {
		if (!detail.item || !draft) {
			return
		}

		setSaveStatus('saving')
		setSaveMessage(null)

		try {
			await updateTask({
				taskId: detail.item.id,
				title: draft.title.trim(),
				note: draft.note.trim() || null,
				status: draft.status as typeof detail.item.status,
				priority: draft.priority as typeof detail.item.priority,
				spaceId: draft.spaceId,
				projectId: draft.projectId || null,
				dueAt: draft.dueAt.trim() || null,
				scheduledAt: draft.scheduledAt.trim() || null,
				reminderAt: draft.reminderAt.trim() || null,
			})
			setSaveStatus('idle')
			setSaveMessage('已保存任务详情。')
		} catch (error) {
			setSaveStatus('error')
			setSaveMessage(error instanceof Error ? error.message : '保存失败')
		}
	}

	async function handleArchiveOrRestore() {
		if (!detail.item) {
			return
		}

		setSaveStatus('saving')
		setSaveMessage(null)

		try {
			if (detail.item.archivedAt) {
				await restoreTask(detail.item.id)
				setSaveMessage('已恢复任务。')
			} else {
				await archiveTask(detail.item.id)
				setSaveMessage('已归档任务。')
			}
			setSaveStatus('idle')
		} catch (error) {
			setSaveStatus('error')
			setSaveMessage(error instanceof Error ? error.message : '操作失败')
		}
	}

	if (detail.status === 'loading' || !draft) {
		return (
			<div className='space-y-4'>
				<StatusNotice className='text-[12px] leading-5' role='status' size='sm'>
					正在加载任务详情...
				</StatusNotice>
				<div className='flex items-center justify-end gap-2'>
					<Button className='rounded-md' onClick={onClose} variant='ghost'>
						关闭
					</Button>
				</div>
			</div>
		)
	}

	if (!detail.item) {
		return (
			<div className='space-y-4'>
				<StatusNotice className='text-[12px] leading-5' role='alert' size='sm' variant='danger'>
					当前没有可展示的任务详情。当前入口：{currentSpaceLabel}。
				</StatusNotice>
				<div className='flex items-center justify-end gap-2'>
					<Button className='rounded-md' onClick={onClose} variant='ghost'>
						关闭
					</Button>
				</div>
			</div>
		)
	}

	return (
		<Tabs className='space-y-4' defaultValue='details'>
			<TabsList className='grid w-full grid-cols-2'>
				<TabsTrigger value='details'>Details</TabsTrigger>
				<TabsTrigger value='activity'>Activity</TabsTrigger>
			</TabsList>

			<TabsContent className='space-y-4' value='details'>
				<div className='space-y-1.5'>
					<p className={DRAWER_SECTION_TITLE_CLASS}>任务</p>
					<Input
						className={`h-10 ${DRAWER_FIELD_CLASS}`}
						onChange={(event) =>
							setDraft((current) =>
								current ? { ...current, title: event.currentTarget.value } : current,
							)
						}
						value={draft.title}
					/>
				</div>

				<label className='space-y-1.5'>
					<span className={DRAWER_SECTION_TITLE_CLASS}>备注</span>
					<Textarea
						className={`min-h-28 ${DRAWER_FIELD_CLASS}`}
						onChange={(event) =>
							setDraft((current) =>
								current ? { ...current, note: event.currentTarget.value } : current,
							)
						}
						value={draft.note}
					/>
				</label>

				<div className='grid gap-3 sm:grid-cols-2'>
					<label className='space-y-1.5'>
						<span className={DRAWER_SECTION_TITLE_CLASS}>状态</span>
						<Select
							onValueChange={(value) =>
								setDraft((current) => (current ? { ...current, status: value } : current))
							}
							value={draft.status}
						>
							<SelectTrigger className={`h-9 w-full ${DRAWER_FIELD_CLASS}`}>
								<SelectValue placeholder='选择状态' />
							</SelectTrigger>
							<SelectContent position='popper'>
								<SelectGroup>
									{TASK_STATUS_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</label>

					<label className='space-y-1.5'>
						<span className={DRAWER_SECTION_TITLE_CLASS}>优先级</span>
						<Select
							onValueChange={(value) =>
								setDraft((current) => (current ? { ...current, priority: Number(value) } : current))
							}
							value={`${draft.priority}`}
						>
							<SelectTrigger className={`h-9 w-full ${DRAWER_FIELD_CLASS}`}>
								<SelectValue placeholder='选择优先级' />
							</SelectTrigger>
							<SelectContent position='popper'>
								<SelectGroup>
									{TASK_PRIORITY_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={`${option.value}`}>
											{option.label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</label>

					<label className='space-y-1.5'>
						<span className={DRAWER_SECTION_TITLE_CLASS}>Space</span>
						<Select
							onValueChange={(value) =>
								setDraft((current) => {
									if (!current) {
										return current
									}
									const nextProjectId =
										current.projectId &&
										!projects.some(
											(project) => project.id === current.projectId && project.spaceId === value,
										)
											? ''
											: current.projectId
									return {
										...current,
										spaceId: value,
										projectId: nextProjectId,
									}
								})
							}
							value={draft.spaceId}
						>
							<SelectTrigger className={`h-9 w-full ${DRAWER_FIELD_CLASS}`}>
								<SelectValue placeholder='选择 Space' />
							</SelectTrigger>
							<SelectContent position='popper'>
								<SelectGroup>
									{spaces.map((space) => (
										<SelectItem key={space.id} value={space.id}>
											{space.name}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</label>

					<label className='space-y-1.5'>
						<span className={DRAWER_SECTION_TITLE_CLASS}>Project</span>
						<Select
							onValueChange={(value) =>
								setDraft((current) => {
									if (!current) {
										return current
									}
									const nextProject = projects.find((project) => project.id === value)
									return {
										...current,
										projectId: value === EMPTY_PROJECT_VALUE ? '' : value,
										spaceId: nextProject?.spaceId ?? current.spaceId,
									}
								})
							}
							value={draft.projectId || EMPTY_PROJECT_VALUE}
						>
							<SelectTrigger className={`h-9 w-full ${DRAWER_FIELD_CLASS}`}>
								<SelectValue placeholder='选择项目' />
							</SelectTrigger>
							<SelectContent position='popper'>
								<SelectGroup>
									<SelectItem value={EMPTY_PROJECT_VALUE}>暂不归类</SelectItem>
									{visibleProjects.map((project) => (
										<SelectItem key={project.id} value={project.id}>
											{project.name}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</label>
				</div>

				<div className='grid gap-3 sm:grid-cols-3'>
					<EditableDateField
						label='Due At'
						value={draft.dueAt}
						onChange={(value) =>
							setDraft((current) => (current ? { ...current, dueAt: value } : current))
						}
					/>
					<EditableDateField
						label='Scheduled At'
						value={draft.scheduledAt}
						onChange={(value) =>
							setDraft((current) => (current ? { ...current, scheduledAt: value } : current))
						}
					/>
					<EditableDateField
						label='Reminder At'
						value={draft.reminderAt}
						onChange={(value) =>
							setDraft((current) => (current ? { ...current, reminderAt: value } : current))
						}
					/>
				</div>

				<div className={`${DRAWER_SECTION_CLASS} grid gap-3 px-3.5 py-3.5 sm:grid-cols-2`}>
					<ReadOnlyField label='Created At' value={detail.item.createdAt} />
					<ReadOnlyField label='Updated At' value={detail.item.updatedAt} />
				</div>

				{saveMessage ? (
					<StatusNotice
						className='text-[12px] leading-5'
						role={saveStatus === 'error' ? 'alert' : 'status'}
						size='sm'
						variant={saveStatus === 'error' ? 'danger' : 'success'}
					>
						{saveMessage}
					</StatusNotice>
				) : null}

				<div className='flex items-center justify-between gap-2'>
					<Button
						className='rounded-md'
						onClick={() => void handleArchiveOrRestore()}
						variant='ghost'
					>
						{detail.item.archivedAt ? '恢复任务' : '归档任务'}
					</Button>
					<div className='flex items-center gap-2'>
						<Button className='rounded-md' onClick={onClose} type='button' variant='ghost'>
							关闭
						</Button>
						<Button
							className='rounded-md'
							disabled={!isDirty || saveStatus === 'saving'}
							onClick={() => void handleSave()}
							type='button'
						>
							{saveStatus === 'saving' ? '保存中...' : '保存修改'}
						</Button>
					</div>
				</div>
			</TabsContent>

			<TabsContent className='space-y-3' value='activity'>
				{activityStatus === 'loading' ? (
					<StatusNotice className='text-[12px] leading-5' role='status' size='sm'>
						正在读取 Activity...
					</StatusNotice>
				) : null}
				{activityStatus === 'error' ? (
					<StatusNotice className='text-[12px] leading-5' role='alert' size='sm' variant='danger'>
						无法读取 Activity timeline。
					</StatusNotice>
				) : null}
				{activityStatus === 'ready' && activityEntries.length === 0 ? (
					<StatusNotice className='text-[12px] leading-5' role='status' size='sm'>
						当前任务还没有 Activity 记录。
					</StatusNotice>
				) : null}
				{activityEntries.map((entry) => (
					<article
						className='space-y-2 rounded-lg border border-(--sf-color-border-subtle) bg-muted/35 p-3'
						key={entry.id}
					>
						<div className='flex flex-wrap items-center gap-2 text-[12px] text-(--sf-color-shell-tertiary)'>
							<span className='font-medium text-foreground'>{entry.action}</span>
							<span>{entry.createdAt}</span>
						</div>
						{entry.summary ? (
							<p className='text-sm leading-6 text-foreground'>{entry.summary}</p>
						) : null}
						{entry.changes.length > 0 ? (
							<div className='space-y-2'>
								{entry.changes.map((change) => (
									<div className='rounded-md bg-card px-3 py-2 text-[12px]' key={change.id}>
										<div className='font-medium text-foreground'>{change.field}</div>
										<div className='mt-1 text-(--sf-color-shell-secondary)'>
											{JSON.stringify(change.oldValue)} → {JSON.stringify(change.newValue)}
										</div>
									</div>
								))}
							</div>
						) : null}
					</article>
				))}
			</TabsContent>
		</Tabs>
	)
}

function EditableDateField({
	label,
	value,
	onChange,
}: {
	label: string
	value: string
	onChange: (value: string) => void
}) {
	return (
		<label className='space-y-1.5'>
			<span className={DRAWER_SECTION_TITLE_CLASS}>{label}</span>
			<Input
				className={`h-9 ${DRAWER_FIELD_CLASS}`}
				onChange={(event) => onChange(event.currentTarget.value)}
				value={value}
			/>
		</label>
	)
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
	return (
		<div className='space-y-1.5'>
			<span className={DRAWER_SECTION_TITLE_CLASS}>{label}</span>
			<div
				className={`flex h-9 items-center rounded-md px-3 text-[12px] text-(--sf-color-shell-secondary) ${DRAWER_FIELD_CLASS}`}
			>
				{value}
			</div>
		</div>
	)
}
