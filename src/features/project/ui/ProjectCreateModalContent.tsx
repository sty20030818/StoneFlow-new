import { useMemo, useState } from 'react'

import { useProjectStore } from '@/features/project/model/useProjectStore'
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
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { Textarea } from '@/shared/ui/base/textarea'
import { dialogShellFooterClass } from '@/shared/ui/patterns/dialog-shell'
import { formFieldLabelVariants, formFieldStackClass } from '@/shared/ui/patterns/form-field'
import { statusNoticeCompactTextClass } from '@/shared/ui/patterns/status-notice'

type ProjectCreateModalContentProps = {
	currentSpaceLabel: string
	spaceId: string | null
	onClose: () => void
}

const EMPTY_SPACE_VALUE = '__project-space-empty__'

function extractErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error) return error.message
	if (typeof error === 'string') return error
	if (error && typeof error === 'object' && 'message' in error) {
		return String((error as { message: unknown }).message)
	}
	return fallback
}

/**
 * Project 创建表单：直接接真实后端写入。
 */
export function ProjectCreateModalContent({
	currentSpaceLabel,
	spaceId,
	onClose,
}: ProjectCreateModalContentProps) {
	const spaces = useSpaceStore(selectSpaces)
	const createProject = useProjectStore((state) => state.createProject)
	const [selectedSpaceId, setSelectedSpaceId] = useState(spaceId ?? spaces[0]?.id ?? '')
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [dueAt, setDueAt] = useState('')
	const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	const currentSpace = useMemo(
		() => spaces.find((item) => item.id === selectedSpaceId) ?? null,
		[selectedSpaceId, spaces],
	)

	async function handleSubmit() {
		if (!selectedSpaceId || name.trim().length === 0) {
			return
		}

		setStatus('submitting')
		setErrorMessage(null)
		try {
			await createProject({
				spaceId: selectedSpaceId,
				name: name.trim(),
				description: description.trim() || null,
				dueAt: dueAt.trim() || null,
			})
			setName('')
			setDescription('')
			setDueAt('')
			setStatus('idle')
			onClose()
		} catch (error) {
			setStatus('error')
			setErrorMessage(extractErrorMessage(error, '项目创建失败'))
		}
	}

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-col gap-4'>
				<label className={formFieldStackClass}>
					<span className={formFieldLabelVariants()}>空间</span>
					<Select
						disabled={status === 'submitting' || spaces.length === 0 || spaceId !== null}
						onValueChange={(value) => setSelectedSpaceId(value === EMPTY_SPACE_VALUE ? '' : value)}
						value={selectedSpaceId || EMPTY_SPACE_VALUE}
					>
						<SelectTrigger className='h-11 w-full rounded-md border-input bg-card'>
							<SelectValue placeholder={spaceId ? currentSpaceLabel : '选择要承载该项目的 Space'} />
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

				<label className={formFieldStackClass} htmlFor='project-create-name'>
					<span className={formFieldLabelVariants()}>项目名称</span>
					<Input
						autoFocus
						className='h-11 rounded-md border-input bg-card'
						disabled={status === 'submitting'}
						id='project-create-name'
						onChange={(event) => setName(event.currentTarget.value)}
						placeholder='例如：工作区打磨'
						value={name}
					/>
				</label>

				<label className={formFieldStackClass} htmlFor='project-create-description'>
					<span className={formFieldLabelVariants()}>项目说明</span>
					<Textarea
						className='min-h-24 rounded-md border-input bg-card'
						disabled={status === 'submitting'}
						id='project-create-description'
						onChange={(event) => setDescription(event.currentTarget.value)}
						placeholder='可选，写一句这个项目承接什么工作。'
						value={description}
					/>
				</label>

				<label className={formFieldStackClass} htmlFor='project-create-due-at'>
					<span className={formFieldLabelVariants()}>截止日期</span>
					<DatePicker
						disabled={status === 'submitting'}
						onChange={(value) => setDueAt(value)}
						placeholder='选择日期'
						value={dueAt}
					/>
				</label>
			</div>

			{errorMessage ? (
				<StatusNotice
					className={statusNoticeCompactTextClass}
					role='alert'
					size='sm'
					variant='danger'
				>
					{errorMessage}
				</StatusNotice>
			) : (
				<StatusNotice className={statusNoticeCompactTextClass} role='status' size='sm'>
					创建后会立即写入当前数据模型。当前入口：{currentSpace?.name ?? currentSpaceLabel}。
				</StatusNotice>
			)}

			<div className={dialogShellFooterClass}>
				<Button disabled={status === 'submitting'} onClick={onClose} variant='ghost'>
					取消
				</Button>
				<Button
					disabled={status === 'submitting' || name.trim().length === 0 || !selectedSpaceId}
					onClick={() => {
						void handleSubmit()
					}}
				>
					{status === 'submitting' ? '创建中...' : '创建项目'}
				</Button>
			</div>
		</div>
	)
}
