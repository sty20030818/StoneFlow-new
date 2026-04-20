import { useEffect } from 'react'

import { INBOX_PRIORITY_OPTIONS } from '@/features/inbox/model/constants'
import type { ProjectRecord } from '@/features/project/model/types'
import { useTaskCreate } from '@/features/task/model/useTaskCreate'
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
import { Textarea } from '@/shared/ui/base/textarea'

type TaskCreateModalContentProps = {
	currentSpaceId: string
	onClose: () => void
	projects: ProjectRecord[]
	projectsLoading: boolean
}

const EMPTY_PRIORITY_VALUE = '__priority-empty__'
const EMPTY_PROJECT_VALUE = '__project-empty__'

/**
 * 新建任务弹窗中的核心表单。
 */
export function TaskCreateModalContent({
	currentSpaceId,
	onClose,
	projects,
	projectsLoading,
}: TaskCreateModalContentProps) {
	const {
		title,
		note,
		priority,
		projectId,
		status,
		errorMessage,
		createdTask,
		setTitle,
		setNote,
		setPriority,
		setProjectId,
		reset,
		submit,
	} = useTaskCreate({
		currentSpaceId,
	})

	useEffect(() => {
		if (status !== 'success') {
			return undefined
		}

		const timer = window.setTimeout(() => {
			reset()
			onClose()
		}, 800)

		return () => {
			window.clearTimeout(timer)
		}
	}, [onClose, reset, status])

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-col gap-4'>
				<label className='flex flex-col gap-1.5' htmlFor='task-create-title'>
					<span className='text-[12px] font-medium text-foreground'>任务标题</span>
					<Input
						autoFocus
						className='h-11 rounded-xl border-black/10 bg-white'
						disabled={status === 'submitting' || status === 'success'}
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
							disabled={status === 'submitting' || status === 'success'}
							onValueChange={(value) => setPriority(value === EMPTY_PRIORITY_VALUE ? '' : value)}
							value={priority || EMPTY_PRIORITY_VALUE}
						>
							<SelectTrigger
								aria-label='优先级'
								className='h-11 w-full rounded-xl border-black/10 bg-white'
							>
								<SelectValue placeholder='选择优先级' />
							</SelectTrigger>
							<SelectContent position='popper'>
								<SelectGroup>
									<SelectItem value={EMPTY_PRIORITY_VALUE}>暂不设置</SelectItem>
									{INBOX_PRIORITY_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</label>

					<label className='flex flex-col gap-1.5'>
						<span className='text-[12px] font-medium text-foreground'>项目</span>
						<Select
							disabled={
								projectsLoading ||
								projects.length === 0 ||
								status === 'submitting' ||
								status === 'success'
							}
							onValueChange={(value) => setProjectId(value === EMPTY_PROJECT_VALUE ? '' : value)}
							value={projectId || EMPTY_PROJECT_VALUE}
						>
							<SelectTrigger
								aria-label='项目'
								className='h-11 w-full rounded-xl border-black/10 bg-white'
							>
								<SelectValue
									placeholder={
										projectsLoading
											? '正在加载项目...'
											: projects.length === 0
												? '暂无项目'
												: '选择项目'
									}
								/>
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
						className='min-h-28 rounded-xl border-black/10 bg-white'
						disabled={status === 'submitting' || status === 'success'}
						id='task-create-note'
						onChange={(event) => setNote(event.currentTarget.value)}
						placeholder='可选，记录上下文、下一步或补充说明。'
						value={note}
					/>
				</label>
			</div>

			{status === 'error' && errorMessage ? (
				<div
					className='rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2 text-[12px] leading-5 text-destructive'
					role='alert'
				>
					{errorMessage}
				</div>
			) : null}

			{status === 'success' && createdTask ? (
				<div
					className='rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 text-[12px] leading-5 text-emerald-700'
					role='status'
				>
					已创建“{createdTask.title}”。
				</div>
			) : null}

			<div className='flex items-center justify-end gap-2'>
				<Button
					className='rounded-xl'
					disabled={status === 'submitting'}
					onClick={() => {
						reset()
						onClose()
					}}
					variant='ghost'
				>
					取消
				</Button>
				<Button
					className='rounded-xl'
					disabled={status === 'submitting' || status === 'success'}
					onClick={() => {
						void submit()
					}}
				>
					{status === 'submitting' ? '创建中...' : status === 'success' ? '已创建' : '创建任务'}
				</Button>
			</div>
		</div>
	)
}
