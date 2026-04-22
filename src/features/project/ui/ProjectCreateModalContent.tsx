import { useEffect } from 'react'

import { useProjectCreate } from '@/features/project/model/useProjectCreate'
import { Button } from '@/shared/ui/base/button'
import { Input } from '@/shared/ui/base/input'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { Textarea } from '@/shared/ui/base/textarea'

type ProjectCreateModalContentProps = {
	currentSpaceId: string
	parentProjectId?: string | null
	onClose: () => void
}

/**
 * 新建项目弹窗中的核心表单。
 */
export function ProjectCreateModalContent({
	currentSpaceId,
	parentProjectId = null,
	onClose,
}: ProjectCreateModalContentProps) {
	const isSubproject = Boolean(parentProjectId)
	const { name, note, status, errorMessage, createdProject, setName, setNote, reset, submit } =
		useProjectCreate({
			currentSpaceId,
			parentProjectId,
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
			<div className='flex flex-col gap-4 rounded-lg border border-(--sf-color-border-subtle) bg-muted/35 p-4'>
				<label className='flex flex-col gap-1.5' htmlFor='project-create-name'>
					<span className='text-[12px] font-medium text-foreground'>项目名称</span>
					<Input
						autoFocus
						className='h-11 rounded-md border-input bg-card'
						disabled={status === 'submitting' || status === 'success'}
						id='project-create-name'
						onChange={(event) => setName(event.currentTarget.value)}
						placeholder={isSubproject ? '例如：M3-E 子项目收口' : '例如：执行层收口'}
						value={name}
					/>
				</label>

				<label className='flex flex-col gap-1.5' htmlFor='project-create-note'>
					<span className='text-[12px] font-medium text-foreground'>项目说明</span>
					<Textarea
						className='min-h-24 rounded-md border-input bg-card'
						disabled={status === 'submitting' || status === 'success'}
						id='project-create-note'
						onChange={(event) => setNote(event.currentTarget.value)}
						placeholder={
							isSubproject
								? '可选，写一句这个子项目承接什么工作。'
								: '可选，写一句这个项目承接什么工作。'
						}
						value={note}
					/>
				</label>
			</div>

			{status === 'error' && errorMessage ? (
				<StatusNotice className='text-[12px] leading-5' role='alert' size='sm' variant='danger'>
					{errorMessage}
				</StatusNotice>
			) : null}

			{status === 'success' && createdProject ? (
				<StatusNotice className='text-[12px] leading-5' role='status' size='sm' variant='success'>
					已创建{isSubproject ? '子项目' : '项目'}“{createdProject.name}”。
				</StatusNotice>
			) : null}

			<div className='flex items-center justify-end gap-2 border-t border-(--sf-color-divider) pt-3'>
				<Button
					className='rounded-md'
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
					className='rounded-md'
					disabled={status === 'submitting' || status === 'success'}
					onClick={() => {
						void submit()
					}}
				>
					{status === 'submitting'
						? '创建中...'
						: status === 'success'
							? '已创建'
							: isSubproject
								? '创建子项目'
								: '创建项目'}
				</Button>
			</div>
		</div>
	)
}
