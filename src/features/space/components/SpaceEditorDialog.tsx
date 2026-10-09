import { Button, Modal } from '@heroui/react'
import { LayersIcon, XIcon } from 'lucide-react'
import { lazy, Suspense, useCallback, useId, useRef, useState } from 'react'

import { ActionTooltip, DisabledActionTooltip } from '@/shared/components/tooltip'
import type { Space } from '@/shared/types'

const LazySpaceEditorForm = lazy(async () => ({
	default: (await import('./SpaceEditorForm')).SpaceEditorForm,
}))

export type SpaceEditorDialogProps = {
	open: boolean
	mode: 'create' | 'edit'
	space?: Space | null
	onClose: () => void
	onSubmit: (input: { name: string; iconKey: string; colorKey: string }) => Promise<void>
}

/** Space 创建 / 编辑窗口同步管理焦点与退出，表单按需加载。 */
export function SpaceEditorDialog(props: SpaceEditorDialogProps) {
	const { open, mode, space = null, onClose } = props
	const descriptionId = useId()
	// 同步 form 保留原生提交与 Header/Body 相邻 recipe；校验仍由异步表单拥有。
	const submitForm = useRef<(() => Promise<void>) | null>(null)
	const onSubmitReady = useCallback((submit: () => Promise<void>) => {
		submitForm.current = submit
		return () => {
			if (submitForm.current === submit) submitForm.current = null
		}
	}, [])
	const [session, setSession] = useState({ open, mode, space, key: 0, submitting: false })
	if (session.open !== open || (open && (session.space !== space || session.mode !== mode))) {
		setSession({
			open,
			mode,
			space,
			key: session.key + (open ? 1 : 0),
			submitting: open ? false : session.submitting,
		})
	}
	const onSubmittingChange = useCallback(
		(submitting: boolean) => {
			setSession((current) =>
				current.key === session.key && current.submitting !== submitting
					? { ...current, submitting }
					: current,
			)
		},
		[session.key],
	)
	const closeButton = (
		<Button
			aria-label='关闭 Space 编辑窗口'
			isDisabled={session.submitting}
			isIconOnly
			size='sm'
			slot='close'
			type='button'
			variant='ghost'
		>
			<XIcon aria-hidden className='size-3.5' />
		</Button>
	)

	return (
		<Modal.Backdrop isOpen={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
			<Modal.Container placement='center' size='lg'>
				<Modal.Dialog
					aria-describedby={descriptionId}
					className='overflow-hidden'
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
					<div className='absolute end-3 top-3'>
						{session.submitting ? (
							<DisabledActionTooltip label='关闭' reason='正在保存，请稍后关闭'>
								{closeButton}
							</DisabledActionTooltip>
						) : (
							<ActionTooltip label='关闭'>{closeButton}</ActionTooltip>
						)}
					</div>
					<form
						onSubmit={(event) => {
							event.preventDefault()
							void submitForm.current?.()
						}}
					>
						<Modal.Header>
							<div className='flex flex-col gap-3 ps-2 pe-10'>
								<div className='flex items-center gap-2'>
									<LayersIcon aria-hidden className='size-4 shrink-0 text-muted' />
									<Modal.Heading>{mode === 'create' ? '新建 Space' : '编辑 Space'}</Modal.Heading>
								</div>
								<p className='text-sm text-muted' id={descriptionId}>
									Space 只承载顶级上下文。设置名称、图标和颜色即可。
								</p>
							</div>
						</Modal.Header>
						<Suspense
							fallback={
								<Modal.Body>
									<p className='text-sm text-muted' role='status'>
										正在加载编辑内容…
									</p>
								</Modal.Body>
							}
						>
							<LazySpaceEditorForm
								key={session.key}
								{...props}
								onSubmitReady={onSubmitReady}
								onSubmittingChange={onSubmittingChange}
								submitting={session.submitting}
							/>
						</Suspense>
					</form>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}
