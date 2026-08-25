import { useId, useState } from 'react'
import { Button, Calendar, Modal } from '@heroui/react'

import {
	getCustomDateDialogDescription,
	getCustomDateDialogRemoveLabel,
	getCustomDateDialogSubmitLabel,
	getCustomDateDialogTitle,
} from '@/features/metadata-fields/core'
import { toCalendarDate, toDateOnlyString } from '@/shared/lib/dateOnly'

type CustomDateDialogProps = {
	open: boolean
	label: string
	value: string | null
	hasExistingValue: boolean
	onOpenChange: (open: boolean) => void
	onSubmit: (value: string | null) => void
}

export function CustomDateDialog({
	open,
	label,
	value,
	hasExistingValue,
	onOpenChange,
	onSubmit,
}: CustomDateDialogProps) {
	return (
		<Modal.Backdrop isOpen={open} onOpenChange={onOpenChange}>
			<CustomDateDialogContent
				hasExistingValue={hasExistingValue}
				label={label}
				onOpenChange={onOpenChange}
				onSubmit={onSubmit}
				value={value}
			/>
		</Modal.Backdrop>
	)
}

function CustomDateDialogContent({
	label,
	value,
	hasExistingValue,
	onOpenChange,
	onSubmit,
}: Omit<CustomDateDialogProps, 'open'>) {
	const [draftDate, setDraftDate] = useState(() => toCalendarDate(value))
	const descriptionId = useId()
	const canSave = draftDate !== null

	return (
		<Modal.Container placement='center' size='sm'>
			<Modal.Dialog
				aria-describedby={descriptionId}
				className='overflow-hidden'
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
						const dateValue = toDateOnlyString(draftDate)
						if (!dateValue) return

						onSubmit(dateValue)
						onOpenChange(false)
					}}
				>
					<Modal.Header>
						<Modal.Heading>{getCustomDateDialogTitle(label)}</Modal.Heading>
						<p className='text-sm text-muted' id={descriptionId}>
							{getCustomDateDialogDescription(label)}
						</p>
					</Modal.Header>

					<Modal.Body>
						<Calendar
							aria-label={`选择${label}`}
							autoFocus
							value={draftDate}
							onChange={setDraftDate}
						>
							<Calendar.Header>
								<Calendar.NavButton slot='previous' />
								<Calendar.Heading />
								<Calendar.NavButton slot='next' />
							</Calendar.Header>
							<Calendar.Grid>
								<Calendar.GridHeader>
									{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
								</Calendar.GridHeader>
								<Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
							</Calendar.Grid>
						</Calendar>
					</Modal.Body>

					<Modal.Footer>
						<div className='flex w-full items-center justify-between gap-2'>
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
						</div>
					</Modal.Footer>
				</form>
			</Modal.Dialog>
		</Modal.Container>
	)
}
