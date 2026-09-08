import { useRef } from 'react'
import { Button, Dropdown } from '@heroui/react'
import { EllipsisIcon } from 'lucide-react'

import {
	MetadataDateDropdown,
	MetadataDateSubmenu,
	taskDateMetadataIcons,
} from '@/features/metadata-fields'

type TaskCreateDatePropertiesProps = {
	dueAt: string | null
	plannedAt: string | null
	remindAt: string | null
	disabled?: boolean
	onDueAtChange: (value: string | null) => void
	onPlannedAtChange: (value: string | null) => void
	onRemindAtChange: (value: string | null) => void
}

export function TaskCreateDateProperties({
	dueAt,
	plannedAt,
	remindAt,
	disabled,
	onDueAtChange,
	onPlannedAtChange,
	onRemindAtChange,
}: TaskCreateDatePropertiesProps) {
	const moreButtonRef = useRef<HTMLButtonElement>(null)
	const fields = [
		{ label: '截止时间', value: dueAt, icon: taskDateMetadataIcons.due, onChange: onDueAtChange },
		{
			label: '计划时间',
			value: plannedAt,
			icon: taskDateMetadataIcons.scheduled,
			onChange: onPlannedAtChange,
		},
		{
			label: '提醒时间',
			value: remindAt,
			icon: taskDateMetadataIcons.reminder,
			onChange: onRemindAtChange,
		},
	].map((field) => ({
		...field,
		onChange: (value: string | null) => {
			field.onChange(value)
			if (value === null) requestAnimationFrame(() => moreButtonRef.current?.focus())
		},
	}))

	return (
		<>
			{fields.map((field) => (
				<MetadataDateDropdown
					key={field.label}
					{...field}
					buttonAppearance='outline'
					disabled={disabled}
					hideWhenEmpty
				/>
			))}
			<Dropdown>
				<Button
					aria-label='更多属性'
					isDisabled={disabled}
					isIconOnly
					ref={moreButtonRef}
					size='sm'
					type='button'
					variant='outline'
				>
					<EllipsisIcon className='size-4' />
				</Button>
				<Dropdown.Popover offset={6} placement='bottom start'>
					<Dropdown.Menu aria-label='更多属性'>
						{fields.map((field) => (
							<MetadataDateSubmenu key={field.label} {...field} disabled={disabled} />
						))}
					</Dropdown.Menu>
				</Dropdown.Popover>
			</Dropdown>
		</>
	)
}
