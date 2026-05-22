import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useRegisterSubmitTarget, type SubmitIntent } from '@/features/submit/model'
import { useEntityDetailController } from '@/features/entity-detail'
import { MetadataDateDropdown, taskDateMetadataIcons } from '@/features/metadata-fields'
import type { ProjectOption } from '@/features/project/model/types'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { buildCreatePlacementInput } from '@/features/task/model/taskPlacement'
import { useTaskStore } from '@/features/task/model/useTaskStore'
import {
	PriorityMetaAction,
	ProjectMetaAction,
	StatusMetaAction,
} from '@/features/task/ui/TaskCreateMetaActions'
import type { Scope, Space, TaskPlacement, TaskStatus } from '@/shared/types'
import { Button } from '@/shared/ui/base/button'
import { Input } from '@/shared/ui/base/input'
import { Switch } from '@/shared/ui/base/switch'
import { Textarea } from '@/shared/ui/base/textarea'
import { CreateModalContent } from '@/shared/ui/create-modal-content'
import { MoreHorizontalIcon, PaperclipIcon, TagIcon } from 'lucide-react'

type TaskCreateContentProps = {
	currentScope: Scope
	spaces: Space[]
	initialPlacement: TaskPlacement | null
	initialProjectId: string | null
	selectedSpaceId: string | null
	initialStatus: TaskStatus
	onClose: () => void
	projects: ProjectOption[]
	projectsLoading: boolean
}

/**
 * 任务创建表单 — 使用 CreateModalContent 组合 layout。
 * 壳层（Dialog + Header）由 CreateDialogShell 统一提供。
 */
export function TaskCreateContent({
	currentScope,
	spaces,
	initialPlacement,
	initialProjectId,
	selectedSpaceId,
	initialStatus,
	onClose,
	projects,
	projectsLoading,
}: TaskCreateContentProps) {
	const createTask = useTaskStore((state) => state.createTask)
	const openEntityDrawer = useEntityDetailController().openDrawer
	const defaultSpaceId = getDefaultSpaceId(spaces)
	const initialProject = projects.find((project) => project.id === initialProjectId) ?? null
	const resolvedInitialSpaceId =
		selectedSpaceId ?? initialProject?.spaceId ?? getInitialSpaceId(currentScope, defaultSpaceId)
	const resolvedInitialPlacement: TaskPlacement = initialProjectId
		? 'project'
		: (initialPlacement ?? 'inbox')

	const [title, setTitle] = useState('')
	const [note, setNote] = useState('')
	const [priority, setPriority] = useState<TaskPriorityValue>(0)
	const [spaceId, setSpaceId] = useState(resolvedInitialSpaceId)
	const [placement, setPlacement] = useState<TaskPlacement>(resolvedInitialPlacement)
	const [projectId, setProjectId] = useState(initialProjectId ?? '')
	const [status, setStatus] = useState<TaskStatus>(initialStatus)
	const [dueAt, setDueAt] = useState<string | null>(null)
	const [scheduledAt, setScheduledAt] = useState<string | null>(null)
	const [reminderAt, setReminderAt] = useState<string | null>(null)
	const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'error'>('idle')
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [createMore, setCreateMore] = useState(false)
	const [createdCount, setCreatedCount] = useState(0)
	const titleInputRef = useRef<HTMLInputElement>(null)
	const isSubmitting = submitState === 'submitting'

	const resetContextFields = useCallback(() => {
		setPriority(0)
		setPlacement(resolvedInitialPlacement)
		setSpaceId(
			selectedSpaceId ?? initialProject?.spaceId ?? getInitialSpaceId(currentScope, defaultSpaceId),
		)
		setProjectId(initialProjectId ?? '')
		setStatus(initialStatus)
		setDueAt(null)
		setScheduledAt(null)
		setReminderAt(null)
	}, [
		currentScope,
		defaultSpaceId,
		initialProject?.spaceId,
		initialProjectId,
		initialStatus,
		resolvedInitialPlacement,
		selectedSpaceId,
	])

	const resetFieldsOnly = useCallback(() => {
		setTitle('')
		setNote('')
		setSubmitState('idle')
		setErrorMessage(null)
	}, [])

	const resetAllToContextDefaults = useCallback(() => {
		resetFieldsOnly()
		resetContextFields()
		setCreateMore(false)
		setCreatedCount(0)
	}, [resetContextFields, resetFieldsOnly])

	useEffect(() => {
		resetAllToContextDefaults()
		// 这里只在弹窗挂载时初始化一次，避免编辑中的草稿被外部 context 变更误清空。
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const visibleProjects = spaceId
		? projects.filter((project) => project.spaceId === spaceId)
		: projects

	const canSubmit =
		!isSubmitting &&
		title.trim().length > 0 &&
		(placement === 'project' ? projectId.length > 0 : spaceId.length > 0)

	const submitTask = useCallback(
		async (intent: SubmitIntent = 'default') => {
			if (placement === 'project' && !projectId) {
				setSubmitState('error')
				setErrorMessage('请选择一个项目，或改为进入收件箱 / 独立事项。')
				return
			}

			if (placement !== 'project' && !spaceId) {
				setSubmitState('error')
				setErrorMessage('当前没有可用 Space，无法创建任务。')
				return
			}

			const effectiveIntent = intent === 'default' && createMore ? 'continue' : intent

			setSubmitState('submitting')
			setErrorMessage(null)

			try {
				const createdTask = await createTask({
					spaceId: placement === 'project' ? null : spaceId,
					placement: buildCreatePlacementInput(placement, projectId || null),
					title: title.trim(),
					note: note.trim() ? note : null,
					status,
					priority,
					dueAt,
					scheduledAt,
					reminderAt,
				})

				if (effectiveIntent === 'continue') {
					resetFieldsOnly()
					setCreateMore(false)
					setCreatedCount((count) => count + 1)
					requestAnimationFrame(() => titleInputRef.current?.focus())
					return
				}

				resetFieldsOnly()
				onClose()
				if (effectiveIntent === 'open') {
					openEntityDrawer({ kind: 'task', id: createdTask.id })
				}
			} catch (error) {
				setSubmitState('error')
				setErrorMessage(error instanceof Error ? error.message : '创建任务失败')
			}
		},
		[
			createMore,
			createTask,
			dueAt,
			note,
			onClose,
			openEntityDrawer,
			placement,
			priority,
			projectId,
			reminderAt,
			resetFieldsOnly,
			scheduledAt,
			spaceId,
			status,
			title,
		],
	)

	const submitTarget = useMemo(
		() => ({
			id: 'task-create',
			title: '创建任务',
			priority: 120,
			canSubmit,
			supportedIntents: ['continue', 'open'] satisfies SubmitIntent[],
			submit: submitTask,
			context: { source: 'task-create' as const },
		}),
		[canSubmit, submitTask],
	)
	useRegisterSubmitTarget(submitTarget)

	return (
		<CreateModalContent>
			<CreateModalContent.Title>
				<Input
					ref={titleInputRef}
					autoFocus
					className='h-auto border-none bg-transparent px-0 text-lg font-black shadow-none focus-visible:ring-0 md:text-lg md:font-black'
					onChange={(event) => setTitle(event.currentTarget.value)}
					placeholder='任务标题'
					value={title}
				/>
			</CreateModalContent.Title>

			<CreateModalContent.Body>
				<Textarea
					className='min-h-20 resize-none border-none bg-transparent px-0 text-[13px] leading-5 shadow-none placeholder:text-sf-text-quaternary focus-visible:ring-0'
					onChange={(event) => setNote(event.currentTarget.value)}
					placeholder='添加描述...'
					value={note}
				/>
			</CreateModalContent.Body>

			<CreateModalContent.Metadata error={submitState === 'error' ? errorMessage : null}>
				<StatusMetaAction disabled={false} status={status} onStatusChange={setStatus} />
				<PriorityMetaAction disabled={false} priority={priority} onPriorityChange={setPriority} />
				<ProjectMetaAction
					disabled={projectsLoading}
					placement={placement}
					projectId={projectId}
					projects={visibleProjects}
					onPlacementChange={(newPlacement, newProjectId) => {
						setPlacement(newPlacement)
						setProjectId(newProjectId ?? '')
						if (newPlacement === 'project' && newProjectId) {
							const targetProject = projects.find((project) => project.id === newProjectId)
							if (targetProject) {
								setSpaceId(targetProject.spaceId)
							}
						}
					}}
				/>
				<MetadataDateDropdown
					buttonLabel={dueAt ? undefined : '截止日期'}
					icon={taskDateMetadataIcons.due}
					label='截止日期'
					value={dueAt}
					onChange={setDueAt}
				/>
				<MetadataDateDropdown
					buttonLabel={scheduledAt ? undefined : '计划日期'}
					icon={taskDateMetadataIcons.scheduled}
					label='计划日期'
					value={scheduledAt}
					onChange={setScheduledAt}
				/>
				<MetadataDateDropdown
					buttonLabel={reminderAt ? undefined : '提醒日期'}
					icon={taskDateMetadataIcons.reminder}
					label='提醒日期'
					value={reminderAt}
					onChange={setReminderAt}
				/>
				<Button onClick={() => toast.info('标签功能即将支持')} size='sm' variant='outline'>
					<TagIcon />
					标签
				</Button>
				<Button onClick={() => toast.info('更多属性即将支持')} size='icon-sm' variant='outline'>
					<MoreHorizontalIcon />
				</Button>
			</CreateModalContent.Metadata>

			<CreateModalContent.Footer>
				<Button onClick={() => toast.info('附件上传功能即将支持')} size='icon-sm' variant='outline'>
					<PaperclipIcon />
				</Button>

				<div className='flex items-center gap-3'>
					<p
						aria-live='polite'
						className='min-w-30 text-right text-[11px] font-medium tabular-nums text-sf-text-tertiary'
					>
						{createdCount > 0 ? `已创建 ${createdCount} 条任务` : '\u00A0'}
					</p>
					<div className='flex items-center gap-1.5 text-[12px] text-sf-text-secondary select-none'>
						<Switch
							checked={createMore}
							onCheckedChange={(checked) => setCreateMore(checked === true)}
							disabled={isSubmitting}
							size='sm'
						/>
						创建更多
					</div>
					<Button disabled={!canSubmit} onClick={() => void submitTask('default')} size='sm'>
						{submitState === 'submitting' ? '创建中…' : '创建任务'}
					</Button>
				</div>
			</CreateModalContent.Footer>
		</CreateModalContent>
	)
}

function getDefaultSpaceId(spaces: Space[]) {
	return spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? ''
}

function getInitialSpaceId(currentScope: Scope, fallbackSpaceId: string) {
	return currentScope.type === 'space' ? currentScope.spaceId : fallbackSpaceId
}
