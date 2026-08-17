import { AlertDialog, Button } from '@heroui/react'
import { useId } from 'react'

import type { DangerConfirmCopy } from '@/features/danger-confirm/model/dangerConfirm'

type DangerConfirmDialogProps = {
	copy: DangerConfirmCopy | null
	open: boolean
	onOpenChange: (open: boolean) => void
	onCancel: () => void
	onConfirm: () => void
}

export function DangerConfirmDialog({
	copy,
	open,
	onCancel,
	onConfirm,
	onOpenChange,
}: DangerConfirmDialogProps) {
	const descriptionId = useId()

	return (
		<AlertDialog.Backdrop
			isKeyboardDismissDisabled={false}
			isOpen={open}
			onOpenChange={onOpenChange}
		>
			<AlertDialog.Container>
				<AlertDialog.Dialog
					aria-describedby={descriptionId}
					render={(dialogProps) => (
						<section
							{...dialogProps}
							onKeyDown={(event) => {
								if (
									event.key === 'Enter' &&
									event.target === event.currentTarget &&
									!event.metaKey &&
									!event.ctrlKey &&
									!event.altKey &&
									!event.shiftKey &&
									!event.nativeEvent.isComposing
								) {
									event.preventDefault()
									onConfirm()
								}
								if (event.key !== 'Escape' || event.defaultPrevented) event.stopPropagation()
							}}
						/>
					)}
				>
					<AlertDialog.Header>
						<AlertDialog.Icon status={copy?.destructive ? 'danger' : 'default'} />
						<AlertDialog.Heading>{copy?.title ?? '确认操作'}</AlertDialog.Heading>
					</AlertDialog.Header>
					<AlertDialog.Body id={descriptionId}>{copy?.description ?? ''}</AlertDialog.Body>
					<AlertDialog.Footer>
						<Button onPress={onCancel} type='button' variant='tertiary'>
							{copy?.cancelLabel ?? '取消'}
						</Button>
						<Button
							onPress={onConfirm}
							type='button'
							variant={copy?.destructive ? 'danger' : 'primary'}
						>
							{copy?.confirmLabel ?? '确认'}
						</Button>
					</AlertDialog.Footer>
				</AlertDialog.Dialog>
			</AlertDialog.Container>
		</AlertDialog.Backdrop>
	)
}
