import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useProjectStore } from '@/features/project/model/useProjectStore'
import { useRegisterSubmitTarget, type SubmitIntent } from '@/features/submit/model'
import { Button } from '@/shared/ui/base/button'
import { Input } from '@/shared/ui/base/input'
import { Switch } from '@/shared/ui/base/switch'
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
	const [createMore, setCreateMore] = useState(false)
	const [createdCount, setCreatedCount] = useState(0)
	const titleInputRef = useRef<HTMLInputElement>(null)
	const isSubmitting = submitState === 'submitting'

	const resetFieldsOnly = useCallback(() => {
		setName('')
		setDescription('')
		setSubmitState('idle')
		setErrorMessage(null)
	}, [])

	const resetSession = useCallback(() => {
		resetFieldsOnly()
		setCreateMore(false)
		setCreatedCount(0)
	}, [resetFieldsOnly])

	useEffect(() => {
		resetSession()
		// 只在挂载时初始化一次，关闭后重新打开会重新挂载。
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const canSubmit = !isSubmitting && name.trim().length > 0 && Boolean(selectedSpaceId)

	const submitProject = useCallback(
		async (intent: SubmitIntent = 'default') => {
			if (!selectedSpaceId || name.trim().length === 0) {
				return
			}

			const effectiveIntent = intent === 'default' && createMore ? 'continue' : intent

			setSubmitState('submitting')
			setErrorMessage(null)
			try {
				await createProject({
					spaceId: selectedSpaceId,
					name: name.trim(),
					description: description.trim() || null,
					dueAt: null,
				})

				if (effectiveIntent === 'continue') {
					resetFieldsOnly()
					setCreateMore(false)
					setCreatedCount((count) => count + 1)
					requestAnimationFrame(() => titleInputRef.current?.focus())
					return
				}

				resetFieldsOnly()
				onClose()
			} catch (error) {
				setSubmitState('error')
				setErrorMessage(extractErrorMessage(error, '项目创建失败'))
			}
		},
		[createMore, createProject, description, name, onClose, resetFieldsOnly, selectedSpaceId],
	)

	const submitTarget = useMemo(
		() => ({
			id: 'project-create',
			title: '创建项目',
			priority: 110,
			canSubmit,
			supportedIntents: ['continue'] satisfies SubmitIntent[],
			submit: submitProject,
			context: { source: 'project-create' as const },
		}),
		[canSubmit, submitProject],
	)
	useRegisterSubmitTarget(submitTarget)

	return (
		<CreateModalContent>
			<CreateModalContent.Title>
				<Input
					ref={titleInputRef}
					autoFocus
					className='h-auto border-none bg-transparent px-0 text-lg font-black shadow-none focus-visible:ring-0 md:text-lg md:font-black'
					onChange={(event) => setName(event.currentTarget.value)}
					placeholder='项目名称'
					value={name}
				/>
			</CreateModalContent.Title>

			<CreateModalContent.Body>
				<Textarea
					className='min-h-20 resize-none border-none bg-transparent px-0 text-[13px] leading-5 shadow-none placeholder:text-sf-text-quaternary focus-visible:ring-0'
					onChange={(event) => setDescription(event.currentTarget.value)}
					placeholder='添加项目说明…'
					value={description}
				/>
			</CreateModalContent.Body>

			<CreateModalContent.Metadata error={submitState === 'error' ? errorMessage : null}>
				<Button onClick={() => toast.info('更多属性即将支持')} size='icon-sm' variant='outline'>
					<MoreHorizontalIcon />
				</Button>
			</CreateModalContent.Metadata>

			<CreateModalContent.Footer>
				<Button
					className='text-sf-icon-secondary'
					onClick={() => toast.info('附件上传功能即将支持')}
					size='icon-sm'
					variant='outline'
				>
					<PaperclipIcon />
				</Button>

				<div className='flex items-center gap-3'>
					<p
						aria-live='polite'
						className='min-w-30 text-right text-[11px] font-medium tabular-nums text-sf-text-tertiary'
					>
						{createdCount > 0 ? `已创建 ${createdCount} 个项目` : '\u00A0'}
					</p>
					<div className='flex items-center gap-1.5 text-[12px] text-sf-text-secondary select-none'>
						<Switch
							checked={createMore}
							onCheckedChange={(checked) => setCreateMore(checked === true)}
							disabled={isSubmitting}
							size='sm'
						/>
						创建更多
					</div>
					<Button disabled={!canSubmit} onClick={() => void submitProject('default')} size='sm'>
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
