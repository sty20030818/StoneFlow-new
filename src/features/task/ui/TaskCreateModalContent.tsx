import { useEffect, useState } from 'react'

import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TASK_PRIORITY_OPTIONS } from '@/features/task/model/taskPriority'
import type { TaskStatus } from '@/shared/types'
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
	currentSpaceLabel: string
	initialProjectId: string | null
	initialStatus: TaskStatus
	onClose: () => void
	projects: Array<{
		id: string
		name: string
	}>
	projectsLoading: boolean
}

const EMPTY_PRIORITY_VALUE = '__priority-empty__'
const EMPTY_PROJECT_VALUE = '__project-empty__'

/**
 * 保留任务创建弹窗的完整表单外观，但在前置阶段 B 只做本地表单状态演示。
 */
export function TaskCreateModalContent({
	currentSpaceLabel,
	initialProjectId,
	initialStatus,
	onClose,
	projects,
	projectsLoading,
}: TaskCreateModalContentProps) {
	const [title, setTitle] = useState('')
	const [note, setNote] = useState('')
	const [priority, setPriority] = useState<TaskPriorityValue>('high')
	const [projectId, setProjectId] = useState(initialProjectId ?? '')
	const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')

	useEffect(() => {
		setProjectId(initialProjectId ?? '')
	}, [initialProjectId])

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
	}, [onClose, status])

	function handleReset() {
		setTitle('')
		setNote('')
		setPriority('high')
		setProjectId(initialProjectId ?? '')
		setStatus('idle')
	}

	function handleSubmit() {
		setStatus('submitting')

		window.setTimeout(() => {
			setStatus('success')
		}, 320)
	}

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
						<span className='text-[12px] font-medium text-foreground'>优先级</span>
						<Select
							disabled={status !== 'idle'}
							onValueChange={(value) =>
								setPriority(value === EMPTY_PRIORITY_VALUE ? '' : (value as TaskPriorityValue))
							}
							value={priority || EMPTY_PRIORITY_VALUE}
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
										<SelectItem
											key={option.value || EMPTY_PRIORITY_VALUE}
											value={option.value || EMPTY_PRIORITY_VALUE}
										>
											{option.value === '' ? '暂不设置' : option.label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</label>

					<label className='flex flex-col gap-1.5'>
						<span className='text-[12px] font-medium text-foreground'>项目</span>
						<Select
							disabled={projectsLoading || status !== 'idle'}
							onValueChange={(value) => setProjectId(value === EMPTY_PROJECT_VALUE ? '' : value)}
							value={projectId || EMPTY_PROJECT_VALUE}
						>
							<SelectTrigger
								aria-label='项目'
								className='h-11 w-full rounded-md border-input bg-card'
							>
								<SelectValue placeholder={projectsLoading ? '正在加载项目...' : '选择项目'} />
							</SelectTrigger>
							<SelectContent position='popper'>
								<SelectGroup>
									<SelectItem value={EMPTY_PROJECT_VALUE}>稍后归类</SelectItem>
									{projects.map((project) => (
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
					已保留“新建任务”弹窗壳层。
					{title.trim() ? ` 任务标题示例：${title.trim()}。` : ''}
					当前 Scope：{currentSpaceLabel} · 目标状态：{initialStatus === 'done' ? 'Done' : 'Todo'}。
				</StatusNotice>
			) : (
				<StatusNotice className='text-[12px] leading-5' role='status' size='sm'>
					前置阶段 B 只保留表单交互与视觉层，真实任务创建逻辑将在后续阶段接入。
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
				<Button disabled={status !== 'idle' || title.trim().length === 0} onClick={handleSubmit}>
					{status === 'submitting' ? '创建中...' : status === 'success' ? '已保留壳层' : '创建任务'}
				</Button>
			</div>
		</div>
	)
}
