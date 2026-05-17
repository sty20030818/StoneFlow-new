import type { BulkActionConfirmationRequest } from '@/features/bulk-action/core'
import { cn } from '@/shared/lib/utils'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/shared/ui/base/alert-dialog'

type BulkActionConfirmDialogProps = {
	request: BulkActionConfirmationRequest | null
	open: boolean
	isExecuting?: boolean
	onOpenChange: (open: boolean) => void
	onCancel: () => void
	onConfirm: () => void
}

export function BulkActionConfirmDialog({
	request,
	open,
	onCancel,
	onConfirm,
	onOpenChange,
}: BulkActionConfirmDialogProps) {
	const copy = request?.copy

	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				onOpenChange(nextOpen)
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{copy?.title ?? '确认批量操作？'}</AlertDialogTitle>
					<AlertDialogDescription>{copy?.description ?? ''}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel}>
						{copy?.cancelLabel ?? '取消'}
					</AlertDialogCancel>
					<AlertDialogAction
						className={cn(request?.action.tone === 'destructive' && destructiveActionClass)}
						onClick={(event) => {
							event.preventDefault()
							onConfirm()
						}}
					>
						{copy?.confirmLabel ?? '确认'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

const destructiveActionClass =
	'border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40'
