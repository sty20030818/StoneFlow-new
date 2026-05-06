import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import type { ProjectOption } from '@/features/project/model/types'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TASK_PRIORITY_OPTIONS } from '@/features/task/model/taskPriority'
import { buildCreatePlacementInput } from '@/features/task/model/taskPlacement'
import { useTaskStore } from '@/features/task/model/useTaskStore'
import { getTaskStatusOption, TASK_STATUS_OPTIONS } from '@/features/task/model/taskStatus'
import { PriorityIcon } from '@/features/task/ui/PriorityIcon'
import { TaskStatusIndicator } from '@/features/task/ui/TaskMetadataSelect'
import type { Scope, Space, TaskPlacement, TaskStatus } from '@/shared/types'
import { Button } from '@/shared/ui/base/button'
import { Input } from '@/shared/ui/base/input'
import { Switch } from '@/shared/ui/base/switch'
import { Textarea } from '@/shared/ui/base/textarea'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import {
	CheckIcon,
	FileIcon,
	FolderIcon,
	InboxIcon,
	MoreHorizontalIcon,
	PaperclipIcon,
	TagIcon,
} from 'lucide-react'

type TaskCreateModalContentProps = {
	currentScope: Scope
	spaces: Space[]
	initialPlacement: TaskPlacement | null
	initialProjectId: string | null
	initialSpaceId: string | null
	initialStatus: TaskStatus
	onClose: () => void
	projects: ProjectOption[]
	projectsLoading: boolean
}

/**
 * 任务创建弹窗表单主体 — Linear 风格布局。
 * 标题 + 描述 + 元数据 Action Buttons + 底部操作栏。
 */
export function TaskCreateModalContent({
	currentScope,
	spaces,
	initialPlacement,
	initialProjectId,
	initialSpaceId,
	initialStatus,
	onClose,
	projects,
	projectsLoading,
}: TaskCreateModalContentProps) {
	const createTask = useTaskStore((state) => state.createTask)
	const defaultSpaceId = getDefaultSpaceId(spaces)
	const initialProject = projects.find((project) => project.id === initialProjectId) ?? null
	const resolvedInitialSpaceId =
		initialSpaceId ?? initialProject?.spaceId ?? getInitialSpaceId(currentScope, defaultSpaceId)

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
	const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>(
		'idle',
	)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [createMore, setCreateMore] = useState(false)

	// 同步外部 initialSpaceId 变化（Space 面包屑切换）
	useEffect(() => {
		setSpaceId(
			initialSpaceId ?? initialProject?.spaceId ?? getInitialSpaceId(currentScope, defaultSpaceId),
		)
	}, [currentScope, defaultSpaceId, initialProject?.spaceId, initialSpaceId])

	// 同步外部 initialStatus 变化
	useEffect(() => {
		setStatus(initialStatus)
	}, [initialStatus])

	const handleReset = useCallback(() => {
		setTitle('')
		setNote('')
		setPriority(0)
		setPlacement(resolvedInitialPlacement)
		setSpaceId(
			initialSpaceId ?? initialProject?.spaceId ?? getInitialSpaceId(currentScope, defaultSpaceId),
		)
		setProjectId(initialProjectId ?? '')
		setStatus(initialStatus)
		setSubmitState('idle')
		setErrorMessage(null)
	}, [
		currentScope,
		defaultSpaceId,
		initialProject?.spaceId,
		initialProjectId,
		initialSpaceId,
		initialStatus,
		resolvedInitialPlacement,
	])

	useEffect(() => {
		if (submitState !== 'success') {
			return undefined
		}

		if (createMore) {
			const timer = window.setTimeout(() => {
				handleReset()
			}, 900)
			return () => window.clearTimeout(timer)
		}

		const timer = window.setTimeout(() => {
			handleReset()
			onClose()
		}, 900)
		return () => window.clearTimeout(timer)
	}, [createMore, handleReset, onClose, submitState])

	async function handleSubmit() {
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

		setSubmitState('submitting')
		setErrorMessage(null)

		try {
			await createTask({
				spaceId: placement === 'project' ? null : spaceId,
				placement: buildCreatePlacementInput(placement, projectId || null),
				title: title.trim(),
				note: note.trim() ? note.trim() : null,
				status,
				priority,
			})
			setSubmitState('success')
		} catch (error) {
			setSubmitState('error')
			setErrorMessage(error instanceof Error ? error.message : '创建任务失败')
		}
	}

	const visibleProjects = spaceId
		? projects.filter((project) => project.spaceId === spaceId)
		: projects

	const canSubmit =
		submitState === 'idle' &&
		title.trim().length > 0 &&
		(placement === 'project' ? projectId.length > 0 : spaceId.length > 0)

	return (
		<div className='flex min-h-0 flex-1 flex-col gap-1.5'>
			{/* 标题：固定，不随描述滚动 */}
			<div className='shrink-0 px-3'>
				<Input
					autoFocus
					className='h-auto border-none bg-transparent px-0 text-lg font-black shadow-none focus-visible:ring-0 md:text-lg md:font-black'
					disabled={submitState !== 'idle'}
					onChange={(event) => setTitle(event.currentTarget.value)}
					placeholder='任务标题'
					value={title}
				/>
			</div>

			{/* 仅描述区：先随 Textarea 长高，弹窗触 max-h 后此处滚动（系统滚动条） */}
			<div className='min-h-0 flex-1 overflow-y-auto px-3'>
				<Textarea
					className='min-h-20 resize-none border-none bg-transparent px-0 text-[13px] leading-5 shadow-none placeholder:text-sf-text-quaternary focus-visible:ring-0'
					disabled={submitState !== 'idle'}
					onChange={(event) => setNote(event.currentTarget.value)}
					placeholder='添加描述...'
					value={note}
				/>
			</div>

			{/* 元数据 + 错误：固定，不随描述滚动 */}
			<div className='shrink-0 space-y-1.5 px-3'>
				<div className='flex flex-wrap items-center gap-1.5'>
					<StatusMetaAction
						disabled={submitState !== 'idle'}
						status={status}
						onStatusChange={setStatus}
					/>
					<PriorityMetaAction
						disabled={submitState !== 'idle'}
						priority={priority}
						onPriorityChange={setPriority}
					/>
					<ProjectMetaAction
						disabled={projectsLoading || submitState !== 'idle'}
						placement={placement}
						projectId={projectId}
						projects={visibleProjects}
						onPlacementChange={(newPlacement, newProjectId) => {
							setPlacement(newPlacement)
							setProjectId(newProjectId ?? '')
							if (newPlacement === 'project' && newProjectId) {
								const targetProject = projects.find((p) => p.id === newProjectId)
								if (targetProject) {
									setSpaceId(targetProject.spaceId)
								}
							}
						}}
					/>
					<Button
						disabled={submitState !== 'idle'}
						onClick={() => toast.info('标签功能即将支持')}
						size='sm'
						variant='outline'
					>
						<TagIcon />
						标签
					</Button>
					<Button
						disabled={submitState !== 'idle'}
						onClick={() => toast.info('更多属性即将支持')}
						size='icon-sm'
						variant='outline'
					>
						<MoreHorizontalIcon />
					</Button>
				</div>

				{submitState === 'error' && errorMessage ? (
					<p className='text-[12px] text-sf-danger-soft-text'>{errorMessage}</p>
				) : null}
			</div>

			{/* 底部操作栏 */}
			<div className='flex shrink-0 items-center justify-between px-3 pb-3 pt-2'>
				<Button
					disabled={submitState !== 'idle'}
					onClick={() => toast.info('附件上传功能即将支持')}
					size='icon-sm'
					variant='outline'
				>
					<PaperclipIcon />
				</Button>

				<div className='flex items-center gap-3'>
					<div className='flex items-center gap-1.5 text-[12px] text-sf-text-secondary select-none'>
						<Switch
							checked={createMore}
							onCheckedChange={(checked) => setCreateMore(checked === true)}
							size='sm'
						/>
						创建更多
					</div>
					<Button disabled={!canSubmit} onClick={() => void handleSubmit()} size='sm'>
						{submitState === 'submitting'
							? '创建中...'
							: submitState === 'success'
								? '已创建'
								: '创建任务'}
					</Button>
				</div>
			</div>
		</div>
	)
}

// ─── 元数据下拉组件 ─────────────────────────────────────────────────────

/**
 * 状态元数据下拉 — outline button + DropdownMenu。
 */
function StatusMetaAction({
	status,
	disabled,
	onStatusChange,
}: {
	status: TaskStatus
	disabled: boolean
	onStatusChange: (status: TaskStatus) => void
}) {
	const currentOption = getTaskStatusOption(status)

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button disabled={disabled} size='sm' variant='outline'>
					<TaskStatusIndicator status={status} />
					{currentOption.label}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' sideOffset={6}>
				<DropdownMenuLabel>状态</DropdownMenuLabel>
				<DropdownMenuGroup>
					{TASK_STATUS_OPTIONS.map((option) => (
						<DropdownMenuItem
							className='gap-2 p-2'
							key={option.value}
							onSelect={() => onStatusChange(option.value)}
						>
							<TaskStatusIndicator status={option.value} />
							<span className='min-w-0 flex-1 truncate'>{option.label}</span>
							{status === option.value ? (
								<CheckIcon
									aria-hidden
									className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary'
								/>
							) : null}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

/**
 * 优先级元数据下拉 — outline button + DropdownMenu。
 */
function PriorityMetaAction({
	priority,
	disabled,
	onPriorityChange,
}: {
	priority: TaskPriorityValue
	disabled: boolean
	onPriorityChange: (priority: TaskPriorityValue) => void
}) {
	const currentOption =
		TASK_PRIORITY_OPTIONS.find((o) => o.value === priority) ?? TASK_PRIORITY_OPTIONS[0]

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button disabled={disabled} size='sm' variant='outline'>
					<PriorityIcon priority={priority} size='sm' />
					{currentOption.label}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' sideOffset={6}>
				<DropdownMenuLabel>优先级</DropdownMenuLabel>
				<DropdownMenuGroup>
					{TASK_PRIORITY_OPTIONS.map((option) => (
						<DropdownMenuItem
							className='gap-2 p-2'
							key={option.value}
							onSelect={() => onPriorityChange(option.value as TaskPriorityValue)}
						>
							<PriorityIcon priority={option.value} size='md' />
							<span className='min-w-0 flex-1 truncate'>{option.label}</span>
							{priority === option.value ? (
								<CheckIcon
									aria-hidden
									className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary'
								/>
							) : null}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

/**
 * 项目元数据下拉 — outline button + DropdownMenu。
 */
function ProjectMetaAction({
	disabled,
	placement,
	projectId,
	projects,
	onPlacementChange,
}: {
	disabled: boolean
	placement: TaskPlacement
	projectId: string
	projects: ProjectOption[]
	onPlacementChange: (placement: TaskPlacement, projectId: string | null) => void
}) {
	const currentProject = projects.find((p) => p.id === projectId)
	const buttonLabel =
		placement === 'project'
			? (currentProject?.name ?? '选择项目')
			: placement === 'noProject'
				? '独立事项'
				: '收件箱'
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button disabled={disabled} size='sm' variant='outline'>
					{placement === 'inbox' ? (
						<InboxIcon className='size-4' />
					) : (
						<FolderIcon className='size-4' />
					)}
					{buttonLabel}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' sideOffset={6}>
				<DropdownMenuLabel>归属</DropdownMenuLabel>
				<DropdownMenuGroup>
					<DropdownMenuItem className='gap-2 p-2' onSelect={() => onPlacementChange('inbox', null)}>
						<InboxIcon className='size-4 text-sf-icon-secondary' />
						<span className='min-w-0 flex-1 truncate'>收件箱</span>
						{placement === 'inbox' ? (
							<CheckIcon aria-hidden className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary' />
						) : null}
					</DropdownMenuItem>
					<DropdownMenuItem
						className='gap-2 p-2'
						onSelect={() => onPlacementChange('noProject', null)}
					>
						<FileIcon className='size-4 text-sf-icon-secondary' />
						<span className='min-w-0 flex-1 truncate'>独立事项</span>
						{placement === 'noProject' ? (
							<CheckIcon aria-hidden className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary' />
						) : null}
					</DropdownMenuItem>
					{projects.map((project) => (
						<DropdownMenuItem
							className='gap-2 p-2'
							key={project.id}
							onSelect={() => onPlacementChange('project', project.id)}
						>
							<FolderIcon className='size-4 text-sf-icon-secondary' />
							<span className='min-w-0 flex-1 truncate'>{project.name}</span>
							{placement === 'project' && projectId === project.id ? (
								<CheckIcon
									aria-hidden
									className='ml-auto size-3.5 shrink-0 text-sf-icon-secondary'
								/>
							) : null}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

// ─── Helpers ────────────────────────────────────────────────────────────

function getDefaultSpaceId(spaces: Space[]) {
	return spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? ''
}

function getInitialSpaceId(currentScope: Scope, defaultSpaceId: string) {
	return currentScope.type === 'space' ? currentScope.spaceId : defaultSpaceId
}
