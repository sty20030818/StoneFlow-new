import { Button, Modal } from '@heroui/react'
import { ListFilterIcon, XIcon } from 'lucide-react'
import { lazy, Suspense, useCallback, useId, useRef } from 'react'

import type { ProjectOption } from '@/features/project'
import { ActionTooltip } from '@/shared/components/tooltip'
import type { UpdateViewInput, View } from '@/shared/types'
import type { ViewSaveFlow } from '../hooks/useViewSaveFlow'
import type { CreateViewDraft } from './ViewEditorDialog.form'

export type ViewEditorDialogProps = {
	flow: ViewSaveFlow
	view: View | null
	projects: ProjectOption[]
	onCreate: (input: CreateViewDraft) => Promise<void>
	onUpdate: (input: UpdateViewInput) => Promise<void>
}

const LazyViewEditorDialogContent = lazy(async () => ({
	default: (await import('./ViewEditorDialogContent')).ViewEditorDialogContent,
}))

export function ViewEditorDialog(props: ViewEditorDialogProps) {
	const { flow, view } = props
	const descriptionId = useId()
	const title = view ? '编辑保存视图' : '新建保存视图'
	const submitForm = useRef<(() => Promise<void>) | null>(null)
	const onSubmitReady = useCallback((submit: () => Promise<void>) => {
		submitForm.current = submit
		return () => {
			if (submitForm.current === submit) submitForm.current = null
		}
	}, [])

	return (
		<Modal.Backdrop isOpen={flow.open} onOpenChange={(nextOpen) => !nextOpen && flow.close()}>
			<Modal.Container placement='center' scroll='inside' size='lg'>
				<Modal.Dialog
					aria-describedby={descriptionId}
					className='max-w-3xl overflow-hidden'
					render={(dialogProps) => (
						<section
							{...dialogProps}
							onKeyDown={(event) => {
								if (event.key === 'Tab') return
								if (event.key !== 'Escape' || event.defaultPrevented) event.stopPropagation()
							}}
						/>
					)}
				>
					<ActionTooltip label='关闭'>
						<Button
							aria-label='关闭保存视图编辑窗口'
							className='absolute inset-e-3 top-3'
							isIconOnly
							size='sm'
							slot='close'
							type='button'
							variant='ghost'
						>
							<XIcon aria-hidden className='size-3.5' />
						</Button>
					</ActionTooltip>
					<form
						className='flex min-h-0 flex-col'
						onSubmit={(event) => {
							event.preventDefault()
							void submitForm.current?.()
						}}
					>
						<Modal.Header>
							<div className='flex flex-col gap-3 ps-2 pe-10'>
								<div className='flex items-center gap-2'>
									<ListFilterIcon aria-hidden className='size-4 shrink-0 text-muted' />
									<Modal.Heading>{title}</Modal.Heading>
								</div>
								<p className='max-w-140 text-sm text-muted' id={descriptionId}>
									{view
										? '这里仅修改名称；查询条件请在保存视图详情中修改并覆盖。'
										: '保存视图固定查询边界与筛选；分组和排序仍由「显示」独立管理。'}
								</p>
							</div>
						</Modal.Header>
						<Suspense
							fallback={
								<Modal.Body>
									<p className='text-sm text-muted' role='status'>
										正在打开…
									</p>
								</Modal.Body>
							}
						>
							<LazyViewEditorDialogContent {...props} onSubmitReady={onSubmitReady} />
						</Suspense>
					</form>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}
