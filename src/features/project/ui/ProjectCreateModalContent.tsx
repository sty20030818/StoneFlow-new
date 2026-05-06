import { useState } from 'react'
import { toast } from 'sonner'

import { useProjectStore } from '@/features/project/model/useProjectStore'
import { Button } from '@/shared/ui/base/button'
import { Input } from '@/shared/ui/base/input'
import { Textarea } from '@/shared/ui/base/textarea'
import { MoreHorizontalIcon, PaperclipIcon } from 'lucide-react'

type ProjectCreateModalContentProps = {
	/** 当前选中的 Space（顶栏下拉与表单提交共用） */
	selectedSpaceId: string | null
	onClose: () => void
}

function extractErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error) return error.message
	if (typeof error === 'string') return error
	if (error && typeof error === 'object' && 'message' in error) {
		return String((error as { message: unknown }).message)
	}
	return fallback
}

/**
 * 项目创建表单主体 — 与任务创建弹窗同一分区：标题 / 描述滚动 / 元数据行 / 底栏。
 */
export function ProjectCreateModalContent({
	selectedSpaceId,
	onClose,
}: ProjectCreateModalContentProps) {
	const createProject = useProjectStore((state) => state.createProject)
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'error'>('idle')
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	async function handleSubmit() {
		if (!selectedSpaceId || name.trim().length === 0) {
			return
		}

		setSubmitState('submitting')
		setErrorMessage(null)
		try {
			await createProject({
				spaceId: selectedSpaceId,
				name: name.trim(),
				description: description.trim() || null,
				dueAt: null,
			})
			setName('')
			setDescription('')
			setSubmitState('idle')
			onClose()
		} catch (error) {
			setSubmitState('error')
			setErrorMessage(extractErrorMessage(error, '项目创建失败'))
		}
	}

	const canSubmit =
		submitState === 'idle' && name.trim().length > 0 && Boolean(selectedSpaceId)

	return (
		<div className='flex min-h-0 flex-1 flex-col gap-1.5'>
			<div className='shrink-0 px-3'>
				<Input
					autoFocus
					className='h-auto border-none bg-transparent px-0 text-lg font-black shadow-none focus-visible:ring-0 md:text-lg md:font-black'
					disabled={submitState === 'submitting'}
					onChange={(event) => setName(event.currentTarget.value)}
					placeholder='项目名称'
					value={name}
				/>
			</div>

			<div className='min-h-0 flex-1 overflow-y-auto px-3'>
				<Textarea
					className='min-h-20 resize-none border-none bg-transparent px-0 text-[13px] leading-5 shadow-none placeholder:text-sf-text-quaternary focus-visible:ring-0'
					disabled={submitState === 'submitting'}
					onChange={(event) => setDescription(event.currentTarget.value)}
					placeholder='添加项目说明…'
					value={description}
				/>
			</div>

			<div className='shrink-0 space-y-1.5 px-3'>
				<div className='flex flex-wrap items-center gap-1.5'>
					<Button
						disabled={submitState === 'submitting'}
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

			<div className='flex shrink-0 items-center justify-between px-3 pb-3 pt-2'>
				<Button
					className='text-sf-icon-secondary'
					disabled={submitState === 'submitting'}
					onClick={() => toast.info('附件上传功能即将支持')}
					size='icon-sm'
					variant='outline'
				>
					<PaperclipIcon />
				</Button>

				<div className='flex items-center gap-3'>
					<Button disabled={!canSubmit} onClick={() => void handleSubmit()} size='sm'>
						{submitState === 'submitting' ? '创建中…' : '创建项目'}
					</Button>
				</div>
			</div>
		</div>
	)
}
