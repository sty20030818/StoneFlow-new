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
import { DatePicker } from '@/shared/ui/base/date-picker'
import { Input } from '@/shared/ui/base/input'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/base/select'
import { Textarea } from '@/shared/ui/base/textarea'

type TaskDrawerContentProps = {
	currentSpaceLabel: string
	taskId: string
	onClose: () => void
	activeTab: 'details' | 'activity'
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

export function TaskDrawerContent({
	currentSpaceLabel: _currentSpaceLabel,
	taskId,
	onClose: _onClose,
	activeTab,
}: TaskDrawerContentProps) {
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

		const normalizedTitle = draft.title.trim()
		const normalizedNote = draft.note.trim() || null
		const normalizedProjectId = draft.projectId || null
		const normalizedDueAt = draft.dueAt.trim() || null
		const normalizedScheduledAt = draft.scheduledAt.trim() || null
		const normalizedReminderAt = draft.reminderAt.trim() || null
		const updateInput = {
			taskId: detail.item.id,
			title: normalizedTitle !== detail.item.title ? normalizedTitle : undefined,
			note: normalizedNote !== detail.item.note ? normalizedNote : undefined,
			status:
				draft.status !== detail.item.status
					? (draft.status as typeof detail.item.status)
					: undefined,
			priority:
				draft.priority !== detail.item.priority
					? (draft.priority as typeof detail.item.priority)
					: undefined,
			spaceId: draft.spaceId !== detail.item.spaceId ? draft.spaceId : undefined,
			projectId: normalizedProjectId !== detail.item.projectId ? normalizedProjectId : undefined,
			dueAt: normalizedDueAt !== detail.item.dueAt ? normalizedDueAt : undefined,
			scheduledAt:
				normalizedScheduledAt !== detail.item.scheduledAt ? normalizedScheduledAt : undefined,
			reminderAt:
				normalizedReminderAt !== detail.item.reminderAt ? normalizedReminderAt : undefined,
		}

		if (Object.values(updateInput).every((value, index) => index === 0 || value === undefined)) {
			setSaveStatus('idle')
			setSaveMessage('没有需要保存的改动')
			return
		}

		setSaveStatus('saving')
		setSaveMessage(null)

		try {
			await updateTask(updateInput)
			setSaveStatus('idle')
			setSaveMessage('已保存')
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
				setSaveMessage('已恢复')
			} else {
				await archiveTask(detail.item.id)
				setSaveMessage('已归档')
			}
			setSaveStatus('idle')
		} catch (error) {
			setSaveStatus('error')
			setSaveMessage(error instanceof Error ? error.message : '操作失败')
		}
	}

	if (detail.status === 'loading' || !draft) {
		return (
			<div className='flex h-full items-center justify-center'>
				<p className='text-[12px] text-sf-text-tertiary'>加载中...</p>
			</div>
		)
	}

	if (!detail.item) {
		return (
			<div className='flex h-full items-center justify-center'>
				<p className='text-[12px] text-sf-text-tertiary'>任务不存在</p>
			</div>
		)
	}

	return (
		<div className='flex h-full flex-col'>
			{/* 内容区 */}
			<div className='no-scrollbar flex-1 overflow-y-auto'>
				{activeTab === 'details' ? (
					<div className='flex flex-col gap-4 p-4'>
						{/* 标题 */}
						<Input
							className='h-9 border-0 bg-transparent px-0 text-[14px] font-medium shadow-none focus-visible:ring-0'
							onChange={(event) =>
								setDraft((current) =>
									current ? { ...current, title: event.currentTarget.value } : current,
								)
							}
							placeholder='任务标题'
							value={draft.title}
						/>

						{/* 备注 */}
						<Textarea
							className='min-h-20 resize-none border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0'
							onChange={(event) =>
								setDraft((current) =>
									current ? { ...current, note: event.currentTarget.value } : current,
								)
							}
							placeholder='添加备注...'
							value={draft.note}
						/>

						{/* 属性区 */}
						<div className='flex flex-col gap-2.5'>
							<DrawerField label='状态'>
								<Select
									onValueChange={(value) =>
										setDraft((current) => (current ? { ...current, status: value } : current))
									}
									value={draft.status}
								>
									<SelectTrigger className='h-7 border-0 bg-transparent px-0 text-[12px] shadow-none focus:ring-0'>
										<SelectValue />
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
							</DrawerField>

							<DrawerField label='优先级'>
								<Select
									onValueChange={(value) =>
										setDraft((current) =>
											current ? { ...current, priority: Number(value) } : current,
										)
									}
									value={`${draft.priority}`}
								>
									<SelectTrigger className='h-7 border-0 bg-transparent px-0 text-[12px] shadow-none focus:ring-0'>
										<SelectValue />
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
							</DrawerField>

							<DrawerField label='Space'>
								<Select
									onValueChange={(value) =>
										setDraft((current) => {
											if (!current) {
												return current
											}
											const nextProjectId =
												current.projectId &&
												!projects.some(
													(project) =>
														project.id === current.projectId && project.spaceId === value,
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
									<SelectTrigger className='h-7 border-0 bg-transparent px-0 text-[12px] shadow-none focus:ring-0'>
										<SelectValue />
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
							</DrawerField>

							<DrawerField label='项目'>
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
									<SelectTrigger className='h-7 border-0 bg-transparent px-0 text-[12px] shadow-none focus:ring-0'>
										<SelectValue />
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
							</DrawerField>

							<DrawerField label='截止日期'>
								<DatePicker
									className='h-7 border-0 bg-transparent px-0 shadow-none hover:bg-transparent focus:ring-0'
									onChange={(value) =>
										setDraft((current) => (current ? { ...current, dueAt: value } : current))
									}
									placeholder='选择日期'
									value={draft.dueAt}
								/>
							</DrawerField>

							<DrawerField label='计划日期'>
								<DatePicker
									className='h-7 border-0 bg-transparent px-0 shadow-none hover:bg-transparent focus:ring-0'
									onChange={(value) =>
										setDraft((current) => (current ? { ...current, scheduledAt: value } : current))
									}
									placeholder='选择日期'
									value={draft.scheduledAt}
								/>
							</DrawerField>

							<DrawerField label='提醒时间'>
								<DatePicker
									className='h-7 border-0 bg-transparent px-0 shadow-none hover:bg-transparent focus:ring-0'
									onChange={(value) =>
										setDraft((current) => (current ? { ...current, reminderAt: value } : current))
									}
									placeholder='选择日期'
									value={draft.reminderAt}
								/>
							</DrawerField>
						</div>

						{/* 只读信息 */}
						<div className='flex flex-col gap-1 border-t border-sf-divider pt-3'>
							<div className='flex items-center justify-between text-[11px] text-sf-text-tertiary'>
								<span>创建于</span>
								<span>{formatDate(detail.item.createdAt)}</span>
							</div>
							<div className='flex items-center justify-between text-[11px] text-sf-text-tertiary'>
								<span>更新于</span>
								<span>{formatDate(detail.item.updatedAt)}</span>
							</div>
						</div>
					</div>
				) : (
					<div className='flex flex-col gap-2 p-4'>
						{activityStatus === 'loading' ? (
							<p className='text-[12px] text-sf-text-tertiary'>加载中...</p>
						) : activityStatus === 'error' ? (
							<p className='text-[12px] text-red-500'>加载失败</p>
						) : activityEntries.length === 0 ? (
							<p className='text-[12px] text-sf-text-tertiary'>暂无动态</p>
						) : (
							activityEntries.map((entry) => (
								<div
									className='rounded-md border border-sf-border-subtle p-2.5'
									key={entry.id}
								>
									<div className='flex items-center gap-2 text-[11px] text-sf-text-tertiary'>
										<span className='font-medium text-foreground'>{entry.action}</span>
										<span>{formatDate(entry.createdAt)}</span>
									</div>
									{entry.summary ? (
										<p className='mt-1 text-[12px] text-sf-text-secondary'>
											{entry.summary}
										</p>
									) : null}
									{entry.changes.length > 0 ? (
										<div className='mt-2 flex flex-col gap-1'>
											{entry.changes.map((change) => (
												<div className='text-[11px]' key={change.id}>
													<span className='text-sf-text-tertiary'>{change.field}:</span>{' '}
													<span className='text-sf-text-secondary'>
														{JSON.stringify(change.oldValue)} → {JSON.stringify(change.newValue)}
													</span>
												</div>
											))}
										</div>
									) : null}
								</div>
							))
						)}
					</div>
				)}
			</div>

			{/* Footer - 固定在底部 */}
			<div className='flex shrink-0 items-center justify-between border-t border-sf-divider px-4 py-2.5'>
				<Button
					className='h-7 px-2 text-[12px]'
					onClick={() => void handleArchiveOrRestore()}
					size='sm'
					variant='ghost'
				>
					{detail.item.archivedAt ? '恢复' : '归档'}
				</Button>
				<div className='flex items-center gap-2'>
					{saveMessage ? (
						<span
							className={`text-[11px] ${
								saveStatus === 'error' ? 'text-red-500' : 'text-sf-text-tertiary'
							}`}
						>
							{saveMessage}
						</span>
					) : null}
					<Button
						className='h-7 px-3 text-[12px]'
						disabled={!isDirty || saveStatus === 'saving'}
						onClick={() => void handleSave()}
						size='sm'
					>
						{saveStatus === 'saving' ? '保存中...' : '保存'}
					</Button>
				</div>
			</div>
		</div>
	)
}

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className='flex items-center gap-3'>
			<span className='w-16 shrink-0 text-[11px] text-sf-text-tertiary'>{label}</span>
			<div className='min-w-0 flex-1'>{children}</div>
		</div>
	)
}

function formatDate(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}
	return new Intl.DateTimeFormat('zh-CN', {
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
	}).format(date)
}
