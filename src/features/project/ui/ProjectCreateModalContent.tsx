import { useMemo, useState } from 'react'

import { useProjectStore } from '@/features/project/model/useProjectStore'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
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

type ProjectCreateModalContentProps = {
	currentSpaceLabel: string
	spaceId: string | null
	onClose: () => void
}

const EMPTY_SPACE_VALUE = '__project-space-empty__'

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
			setErrorMessage(error instanceof Error ? error.message : '项目创建失败')
		}
	}

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex flex-col gap-4'>
				<label className='flex flex-col gap-1.5'>
					<span className='text-[12px] font-medium text-foreground'>Space</span>
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

				<label className='flex flex-col gap-1.5' htmlFor='project-create-name'>
					<span className='text-[12px] font-medium text-foreground'>项目名称</span>
					<Input
						autoFocus
						className='h-11 rounded-md border-input bg-card'
						disabled={status === 'submitting'}
						id='project-create-name'
						onChange={(event) => setName(event.currentTarget.value)}
						placeholder='例如：Workspace shell polish'
						value={name}
					/>
				</label>

				<label className='flex flex-col gap-1.5' htmlFor='project-create-description'>
					<span className='text-[12px] font-medium text-foreground'>项目说明</span>
					<Textarea
						className='min-h-24 rounded-md border-input bg-card'
						disabled={status === 'submitting'}
						id='project-create-description'
						onChange={(event) => setDescription(event.currentTarget.value)}
						placeholder='可选，写一句这个项目承接什么工作。'
						value={description}
					/>
				</label>

				<label className='flex flex-col gap-1.5' htmlFor='project-create-due-at'>
					<span className='text-[12px] font-medium text-foreground'>截止日期</span>
					<Input
						className='h-11 rounded-md border-input bg-card'
						disabled={status === 'submitting'}
						id='project-create-due-at'
						onChange={(event) => setDueAt(event.currentTarget.value)}
						placeholder='例如：2026-05-10'
						value={dueAt}
					/>
				</label>
			</div>

			{errorMessage ? (
				<StatusNotice className='text-[12px] leading-5' role='alert' size='sm' variant='danger'>
					{errorMessage}
				</StatusNotice>
			) : (
				<StatusNotice className='text-[12px] leading-5' role='status' size='sm'>
					创建后会立即写入当前数据模型。当前入口：{currentSpace?.name ?? currentSpaceLabel}。
				</StatusNotice>
			)}

			<div className='flex items-center justify-end gap-2 border-t border-(--sf-color-divider) pt-3'>
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
