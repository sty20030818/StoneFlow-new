import { useCallback, useEffect, useState } from 'react'

import type { ProjectOption } from '@/features/project/model/types'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TASK_PRIORITY_OPTIONS } from '@/features/task/model/taskPriority'
import {
	buildCreatePlacementInput,
	formatTaskPlacementLabel,
} from '@/features/task/model/taskPlacement'
import { useTaskStore } from '@/features/task/model/useTaskStore'
import type { Scope, Space, TaskPlacement, TaskStatus } from '@/shared/types'
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
import { Textarea } from '@/shared/ui/base/textarea'

type TaskCreateModalContentProps = {
	currentScope: Scope
	spaces: Space[]
	initialProjectId: string | null
	initialStatus: TaskStatus
	onClose: () => void
	projects: ProjectOption[]
	projectsLoading: boolean
}

const EMPTY_PRIORITY_VALUE = '__priority-empty__'
const EMPTY_SPACE_VALUE = '__space-empty__'
const INBOX_PLACEMENT_VALUE = '__task-placement-inbox__'
const NO_PROJECT_PLACEMENT_VALUE = '__task-placement-no-project__'

/**
 * 阶段 6：任务创建弹窗直连真实 Task 创建命令，规则在 UI 层只做最小输入约束。
 */
export function TaskCreateModalContent({
	currentScope,
	spaces,
	initialProjectId,
	initialStatus,
	onClose,
	projects,
	projectsLoading,
}: TaskCreateModalContentProps) {
	const createTask = useTaskStore((state) => state.createTask)
	const lockedProject = initialProjectId !== null
	const defaultSpaceId = getDefaultSpaceId(spaces)
	const initialProject = projects.find((project) => project.id === initialProjectId) ?? null
	const initialSpaceId = initialProject?.spaceId ?? getInitialSpaceId(currentScope, defaultSpaceId)
	const initialPlacement: TaskPlacement = initialProjectId ? 'project' : 'inbox'
	const [title, setTitle] = useState('')
	const [note, setNote] = useState('')
	const [priority, setPriority] = useState<TaskPriorityValue>(3)
	const [spaceId, setSpaceId] = useState(initialSpaceId)
	const [placement, setPlacement] = useState<TaskPlacement>(initialPlacement)
	const [projectId, setProjectId] = useState(initialProjectId ?? '')
	const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	useEffect(() => {
		setPlacement(initialProjectId ? 'project' : 'inbox')
		setProjectId(initialProjectId ?? '')
		setSpaceId(initialProject?.spaceId ?? getInitialSpaceId(currentScope, defaultSpaceId))
	}, [currentScope, defaultSpaceId, initialProject?.spaceId, initialProjectId])

	const handleReset = useCallback(() => {
		setTitle('')
		setNote('')
		setPriority(3)
		setPlacement(initialProjectId ? 'project' : 'inbox')
		setSpaceId(initialProject?.spaceId ?? getInitialSpaceId(currentScope, defaultSpaceId))
		setProjectId(initialProjectId ?? '')
		setStatus('idle')
		setErrorMessage(null)
	}, [currentScope, defaultSpaceId, initialProject?.spaceId, initialProjectId])

	useEffect(() => {
		if (status !== 'success') {
			return undefined
		}

		const timer = window.setTimeout(() => {
			handleReset()
			onClose()
		}, 900)

		return () => {
			window.clearTimeout(timer)
		}
	}, [handleReset, onClose, status])

	async function handleSubmit() {
		if (placement === 'project' && !projectId) {
			setStatus('error')
			setErrorMessage('请选择一个项目，或改为进入收件箱 / 独立事项。')
			return
		}

		if (placement !== 'project' && !spaceId) {
			setStatus('error')
			setErrorMessage('当前没有可用 Space，无法创建任务。')
			return
		}

		setStatus('submitting')
		setErrorMessage(null)

		try {
			await createTask({
				spaceId: placement === 'project' ? null : spaceId,
				placement: buildCreatePlacementInput(placement, projectId || null),
				title: title.trim(),
				note: note.trim() ? note.trim() : null,
				status: initialStatus,
				priority,
			})
			setStatus('success')
		} catch (error) {
			setStatus('error')
			setErrorMessage(error instanceof Error ? error.message : '创建任务失败')
		}
	}

	const visibleProjects = spaceId
		? projects.filter((project) => project.spaceId === spaceId)
		: projects
	const canSubmit =
		status === 'idle' &&
		title.trim().length > 0 &&
		(placement === 'project' ? projectId.length > 0 : spaceId.length > 0)

	const placementSelectValue = (() => {
		if (placement === 'project') {
			return projectId || INBOX_PLACEMENT_VALUE
		}
		return placement === 'noProject' ? NO_PROJECT_PLACEMENT_VALUE : INBOX_PLACEMENT_VALUE
	})()

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-col gap-4'>
				<label className='flex flex-col gap-1.5' htmlFor='task-create-title'>
					<span className='text-[12px] font-medium text-foreground'>任务标题</span>
					<Input
						autoFocus
						className='h-11 rounded-md border-input bg-card'
						disabled={status !== 'idle'}
						id='task-create-title'
						onChange={(event) => setTitle(event.currentTarget.value)}
						placeholder='例如：整理今天的任务捕获链路'
						value={title}
					/>
				</label>

				<div className='grid gap-4 sm:grid-cols-2'>
					<label className='flex flex-col gap-1.5'>
						<span className='text-[12px] font-medium text-foreground'>空间</span>
						<Select
							disabled={lockedProject || placement === 'project' || status !== 'idle'}
							onValueChange={(value) => {
								const nextSpaceId = value === EMPTY_SPACE_VALUE ? '' : value
								setSpaceId(nextSpaceId)
								if (
									projectId &&
									!projects.some(
										(project) => project.id === projectId && project.spaceId === nextSpaceId,
									)
								) {
									setProjectId('')
								}
							}}
							value={spaceId || EMPTY_SPACE_VALUE}
						>
							<SelectTrigger
								aria-label='Space'
								className='h-11 w-full rounded-md border-input bg-card'
							>
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

					<label className='flex flex-col gap-1.5'>
						<span className='text-[12px] font-medium text-foreground'>优先级</span>
						<Select
							disabled={status !== 'idle'}
							onValueChange={(value) =>
								setPriority(
									value === EMPTY_PRIORITY_VALUE ? 0 : (Number(value) as TaskPriorityValue),
								)
							}
							value={`${priority || 0}`}
						>
							<SelectTrigger
								aria-label='优先级'
								className='h-11 w-full rounded-md border-input bg-card'
							>
								<SelectValue placeholder='选择优先级' />
							</SelectTrigger>
							<SelectContent position='popper'>
								<SelectGroup>
									{TASK_PRIORITY_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={`${option.value}`}>
											{option.value === 0 ? '暂不设置' : option.label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</label>

					<label className='flex flex-col gap-1.5'>
						<span className='text-[12px] font-medium text-foreground'>归属目标</span>
						<Select
							disabled={lockedProject || projectsLoading || status !== 'idle'}
							onValueChange={(value) => {
								if (value === INBOX_PLACEMENT_VALUE) {
									setPlacement('inbox')
									setProjectId('')
									return
								}

								if (value === NO_PROJECT_PLACEMENT_VALUE) {
									setPlacement('noProject')
									setProjectId('')
									return
								}

								const targetProject = projects.find((project) => project.id === value) ?? null
								setPlacement('project')
								setProjectId(value)
								if (targetProject) {
									setSpaceId(targetProject.spaceId)
								}
							}}
							value={lockedProject ? (initialProjectId ?? '') : placementSelectValue}
						>
							<SelectTrigger
								aria-label='归属目标'
								className='h-11 w-full rounded-md border-input bg-card'
							>
								<SelectValue placeholder={projectsLoading ? '正在加载项目...' : '选择归属目标'} />
							</SelectTrigger>
							<SelectContent position='popper'>
								<SelectGroup>
									{!lockedProject ? (
										<>
											<SelectItem value={INBOX_PLACEMENT_VALUE}>进入收件箱</SelectItem>
											<SelectItem value={NO_PROJECT_PLACEMENT_VALUE}>独立事项</SelectItem>
										</>
									) : null}
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

				<label className='flex flex-col gap-1.5' htmlFor='task-create-note'>
					<span className='text-[12px] font-medium text-foreground'>备注</span>
					<Textarea
						className='min-h-28 rounded-md border-input bg-card'
						disabled={status !== 'idle'}
						id='task-create-note'
						onChange={(event) => setNote(event.currentTarget.value)}
						placeholder='可选，记录上下文、下一步或补充说明。'
						value={note}
					/>
				</label>
			</div>

			{status === 'success' ? (
				<StatusNotice className='text-[12px] leading-5' role='status' size='sm' variant='success'>
					已创建任务。
					{title.trim() ? ` 任务：${title.trim()}。` : ''}
					归属：{placement === 'project' ? '项目' : formatTaskPlacementLabel(placement)}。
				</StatusNotice>
			) : status === 'error' ? (
				<StatusNotice className='text-[12px] leading-5' role='alert' size='sm' variant='danger'>
					{errorMessage ?? '创建任务失败。'}
				</StatusNotice>
			) : (
				<StatusNotice className='text-[12px] leading-5' role='status' size='sm'>
					阶段 7 使用归属三态：进入收件箱、独立事项、具体项目。在项目内创建时会锁定项目。
				</StatusNotice>
			)}

			<div className='flex items-center justify-end gap-2 border-t border-(--sf-color-divider) pt-3'>
				<Button
					disabled={status === 'submitting'}
					onClick={() => {
						handleReset()
						onClose()
					}}
					variant='ghost'
				>
					取消
				</Button>
				<Button disabled={!canSubmit} onClick={() => void handleSubmit()}>
					{status === 'submitting' ? '创建中...' : status === 'success' ? '创建成功' : '创建任务'}
				</Button>
			</div>
		</div>
	)
}

function getDefaultSpaceId(spaces: Space[]) {
	return spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? ''
}

function getInitialSpaceId(currentScope: Scope, defaultSpaceId: string) {
	return currentScope.type === 'space' ? currentScope.spaceId : defaultSpaceId
}
