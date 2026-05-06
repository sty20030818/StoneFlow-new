import { useState } from 'react'
import { toast } from 'sonner'

import { useProjectStore } from '@/features/project/model/useProjectStore'
import { Button } from '@/shared/ui/base/button'
import { Input } from '@/shared/ui/base/input'
import { Textarea } from '@/shared/ui/base/textarea'
import { CreateModalContent } from '@/shared/ui/create-modal-content'
import { MoreHorizontalIcon, PaperclipIcon } from 'lucide-react'

type ProjectCreateContentProps = {
	selectedSpaceId: string | null
	onClose: () => void
}

/**
 * 项目创建表单 — 使用 CreateModalContent 组合 layout。
 * 壳层（Dialog + Header）由 CreateDialogShell 统一提供。
 */
export function ProjectCreateContent({ selectedSpaceId, onClose }: ProjectCreateContentProps) {
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
		<CreateModalContent>
			<CreateModalContent.Title>
				<Input
					autoFocus
					className='h-auto border-none bg-transparent px-0 text-lg font-black shadow-none focus-visible:ring-0 md:text-lg md:font-black'
					disabled={submitState === 'submitting'}
					onChange={(event) => setName(event.currentTarget.value)}
					placeholder='项目名称'
					value={name}
				/>
			</CreateModalContent.Title>

			<CreateModalContent.Body>
				<Textarea
					className='min-h-20 resize-none border-none bg-transparent px-0 text-[13px] leading-5 shadow-none placeholder:text-sf-text-quaternary focus-visible:ring-0'
					disabled={submitState === 'submitting'}
					onChange={(event) => setDescription(event.currentTarget.value)}
					placeholder='添加项目说明…'
					value={description}
				/>
			</CreateModalContent.Body>

			<CreateModalContent.Metadata error={submitState === 'error' ? errorMessage : null}>
				<Button
					disabled={submitState === 'submitting'}
					onClick={() => toast.info('更多属性即将支持')}
					size='icon-sm'
					variant='outline'
				>
					<MoreHorizontalIcon />
				</Button>
			</CreateModalContent.Metadata>

			<CreateModalContent.Footer>
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
			</CreateModalContent.Footer>
		</CreateModalContent>
	)
}

function extractErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error) return error.message
	if (typeof error === 'string') return error
	if (error && typeof error === 'object' && 'message' in error) {
		return String((error as { message: unknown }).message)
	}
	return fallback
}
