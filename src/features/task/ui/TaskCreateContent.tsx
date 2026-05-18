import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useRegisterSubmitTarget } from '@/features/submit/model'
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
	const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>(
		'idle',
	)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [createMore, setCreateMore] = useState(false)
	const titleInputRef = useRef<HTMLInputElement>(null)

	// 同步外部 selectedSpaceId 变化（Shell 层 Space 面包屑切换）
	useEffect(() => {
		setSpaceId(
			selectedSpaceId ?? initialProject?.spaceId ?? getInitialSpaceId(currentScope, defaultSpaceId),
		)
	}, [currentScope, defaultSpaceId, initialProject?.spaceId, selectedSpaceId])

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
			selectedSpaceId ?? initialProject?.spaceId ?? getInitialSpaceId(currentScope, defaultSpaceId),
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
		selectedSpaceId,
		initialStatus,
		resolvedInitialPlacement,
	])

	useEffect(() => {
		if (submitState !== 'success') return

		if (createMore) {
			handleReset()
			// 重置后聚焦标题输入框
			requestAnimationFrame(() => titleInputRef.current?.focus())
			return
		}

		handleReset()
		onClose()
	}, [createMore, handleReset, onClose, submitState])

	const handleSubmit = useCallback(async () => {
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
	}, [createTask, placement, projectId, spaceId, status, priority, title, note])

	const visibleProjects = spaceId
		? projects.filter((project) => project.spaceId === spaceId)
		: projects

	const canSubmit =
		submitState === 'idle' &&
		title.trim().length > 0 &&
		(placement === 'project' ? projectId.length > 0 : spaceId.length > 0)
	const submitTarget = useMemo(
		() => ({
			id: 'task-create',
			title: '创建任务',
			priority: 120,
			canSubmit,
			submit: handleSubmit,
			context: { source: 'task-create' as const },
		}),
		[canSubmit, handleSubmit],
	)
	useRegisterSubmitTarget(submitTarget)

	return (
		<CreateModalContent>
			<CreateModalContent.Title>
				<Input
					ref={titleInputRef}
					autoFocus
					className='h-auto border-none bg-transparent px-0 text-lg font-black shadow-none focus-visible:ring-0 md:text-lg md:font-black'
					disabled={submitState !== 'idle'}
					onChange={(event) => setTitle(event.currentTarget.value)}
					placeholder='任务标题'
					value={title}
				/>
			</CreateModalContent.Title>

			<CreateModalContent.Body>
				<Textarea
					className='min-h-20 resize-none border-none bg-transparent px-0 text-[13px] leading-5 shadow-none placeholder:text-sf-text-quaternary focus-visible:ring-0'
					disabled={submitState !== 'idle'}
					onChange={(event) => setNote(event.currentTarget.value)}
					placeholder='添加描述...'
					value={note}
				/>
			</CreateModalContent.Body>

			<CreateModalContent.Metadata error={submitState === 'error' ? errorMessage : null}>
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
			</CreateModalContent.Metadata>

			<CreateModalContent.Footer>
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
			</CreateModalContent.Footer>
		</CreateModalContent>
	)
}

// ─── Helpers ────────────────────────────────────────────────────────────

function getDefaultSpaceId(spaces: Space[]) {
	return spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? ''
}

function getInitialSpaceId(currentScope: Scope, defaultSpaceId: string) {
	return currentScope.type === 'space' ? currentScope.spaceId : defaultSpaceId
}
