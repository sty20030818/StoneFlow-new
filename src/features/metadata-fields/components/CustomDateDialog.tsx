import { useEffect, useId, useMemo, useState } from 'react'
import { Button, Input, Label, Modal } from '@heroui/react'

import {
	formatCustomDateStorageValue,
	getCustomDateDialogDescription,
	getCustomDateDialogRemoveLabel,
	getCustomDateDialogSubmitLabel,
	getCustomDateDialogTitle,
	parseCustomDateInputValue,
} from '@/features/metadata-fields/core'

type CustomDateDialogProps = {
	open: boolean
	fieldKey: 'dueDate' | 'scheduledDate' | 'reminderDate'
	label: string
	value: string | null
	hasExistingValue: boolean
	onOpenChange: (open: boolean) => void
	onSubmit: (value: string | null) => void
}

export function CustomDateDialog({
	open,
	fieldKey,
	label,
	value,
	hasExistingValue,
	onOpenChange,
	onSubmit,
}: CustomDateDialogProps) {
	const [draftInput, setDraftInput] = useState('')
	const descriptionId = useId()

	useEffect(() => {
		if (open) {
			setDraftInput(value?.slice(0, 10) ?? '')
		}
	}, [open, value])

	const parsedDate = useMemo(() => parseCustomDateInputValue(draftInput), [draftInput])
	const canSave = draftInput.length > 0 && parsedDate !== null

	return (
		<Modal.Backdrop isOpen={open} onOpenChange={onOpenChange}>
			<Modal.Container placement='center' size='sm'>
				<Modal.Dialog
					aria-describedby={descriptionId}
					className='gap-0 overflow-hidden p-0'
					render={(dialogProps) => (
						<section
							{...dialogProps}
							onKeyDown={(event) => {
								if (event.key !== 'Escape' || event.defaultPrevented) event.stopPropagation()
							}}
						/>
					)}
				>
					<form
						onSubmit={(event) => {
							event.preventDefault()
							if (!parsedDate) return

							onSubmit(formatCustomDateStorageValue(parsedDate))
							onOpenChange(false)
						}}
					>
						<Modal.Header className='gap-1 px-5 pt-5 pb-3'>
							<Modal.Heading>{getCustomDateDialogTitle(label)}</Modal.Heading>
							<p className='text-sm text-muted' id={descriptionId}>
								{getCustomDateDialogDescription(label)}
							</p>
						</Modal.Header>

						<Modal.Body className='px-5 py-2'>
							<div className='grid gap-1.5'>
								<Label htmlFor={`custom-date-input-${fieldKey}`}>{label}</Label>
								<Input
									autoFocus
									fullWidth
									id={`custom-date-input-${fieldKey}`}
									type='date'
									value={draftInput}
									onChange={(event) => setDraftInput(event.currentTarget.value)}
								/>
							</div>
						</Modal.Body>

						<Modal.Footer className='justify-between px-5 pt-3 pb-5'>
							<div>
								{hasExistingValue ? (
									<Button
										onPress={() => {
											onSubmit(null)
											onOpenChange(false)
										}}
										variant='outline'
									>
										{getCustomDateDialogRemoveLabel(label)}
									</Button>
								) : null}
							</div>
							<div className='flex gap-2'>
								<Button onPress={() => onOpenChange(false)} variant='ghost'>
									取消
								</Button>
								<Button isDisabled={!canSave} type='submit'>
									{getCustomDateDialogSubmitLabel(label)}
								</Button>
							</div>
						</Modal.Footer>
					</form>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}
