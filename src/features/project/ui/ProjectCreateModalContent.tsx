import { useEffect, useState } from 'react'

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
 * 保留项目创建弹窗的完整外观，在前置阶段 B 只使用本地表单状态。
 */
export function ProjectCreateModalContent({
	currentSpaceId,
	parentProjectId = null,
	onClose,
}: ProjectCreateModalContentProps) {
	const isSubproject = Boolean(parentProjectId)
	const [name, setName] = useState('')
	const [note, setNote] = useState('')
	const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')

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
		setName('')
		setNote('')
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
				<label className='flex flex-col gap-1.5' htmlFor='project-create-name'>
					<span className='text-[12px] font-medium text-foreground'>项目名称</span>
					<Input
						autoFocus
						className='h-11 rounded-md border-input bg-card'
						disabled={status !== 'idle'}
						id='project-create-name'
						onChange={(event) => setName(event.currentTarget.value)}
						placeholder={isSubproject ? '例如：Header 壳层收口' : '例如：Workspace shell polish'}
						value={name}
					/>
				</label>

				<label className='flex flex-col gap-1.5' htmlFor='project-create-note'>
					<span className='text-[12px] font-medium text-foreground'>项目说明</span>
					<Textarea
						className='min-h-24 rounded-md border-input bg-card'
						disabled={status !== 'idle'}
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

			{status === 'success' ? (
				<StatusNotice className='text-[12px] leading-5' role='status' size='sm' variant='success'>
					已保留{isSubproject ? '子项目' : '项目'}创建弹窗壳层。
					{name.trim() ? ` 示例名称：${name.trim()}。` : ''}
					当前 Space：{currentSpaceId}。
				</StatusNotice>
			) : (
				<StatusNotice className='text-[12px] leading-5' role='status' size='sm'>
					前置阶段 B 只保留表单交互和视觉层，真实项目创建逻辑将在后续阶段接入。
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
				<Button disabled={status !== 'idle' || name.trim().length === 0} onClick={handleSubmit}>
					{status === 'submitting'
						? '创建中...'
						: status === 'success'
							? '已保留壳层'
							: isSubproject
								? '创建子项目'
								: '创建项目'}
				</Button>
			</div>
		</div>
	)
}
