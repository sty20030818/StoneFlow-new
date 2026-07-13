import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { formFieldHintClass } from '@/shared/ui/patterns/form-field'
import {
	settingsPanelDescriptionClass,
	settingsPanelHeaderWrapClass,
	settingsPanelSectionClass,
	settingsPanelTitleClass,
} from '@/shared/ui/patterns/settings-panel'

export function SettingsSection({
	title,
	description,
	children,
}: {
	title: string
	description: string
	children: ReactNode
}) {
	return (
		<section className={settingsPanelSectionClass}>
			<div className={settingsPanelHeaderWrapClass}>
				<h2 className={settingsPanelTitleClass}>{title}</h2>
				<p className={settingsPanelDescriptionClass}>{description}</p>
			</div>
			{children}
		</section>
	)
}

/** 行式偏好项：左文案右控件（窄屏上下堆叠） */
export function SettingsPreferenceRow({
	label,
	description,
	control,
	htmlFor,
}: {
	label: string
	description: string
	control: ReactNode
	htmlFor?: string
}) {
	return (
		<div className='flex flex-col gap-3 border-b border-sf-border-subtle py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6'>
			<div className='min-w-0 flex-1'>
				<label className='text-sm font-medium text-foreground' htmlFor={htmlFor}>
					{label}
				</label>
				<p className={formFieldHintClass}>{description}</p>
			</div>
			<div className='shrink-0 sm:self-center'>{control}</div>
		</div>
	)
}

export function SettingCheckboxRow({
	label,
	description,
	checked,
	disabled,
	onChange,
}: {
	label: string
	description: string
	checked: boolean
	disabled?: boolean
	onChange: (checked: boolean) => void
}) {
	const inputId = `setting-checkbox-${label.replace(/\s+/g, '-').toLowerCase()}`

	return (
		<SettingsPreferenceRow
			description={description}
			htmlFor={inputId}
			label={label}
			control={
				<input
					checked={checked}
					className={cn(
						'size-4 rounded border-sf-border-strong',
						disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
					)}
					disabled={disabled}
					id={inputId}
					onChange={(event) => onChange(event.currentTarget.checked)}
					type='checkbox'
				/>
			}
		/>
	)
}

export function SettingInfoRow({
	label,
	description,
	value,
}: {
	label: string
	description: string
	value: ReactNode
}) {
	return (
		<div className='rounded-xl border border-sf-border-subtle bg-muted/25 p-3'>
			<p className='text-sm font-medium text-foreground'>{label}</p>
			<div className='mt-1 text-sm text-foreground'>{value}</div>
			<p className={`mt-1 ${formFieldHintClass}`}>{description}</p>
		</div>
	)
}

export function SettingsPreferenceGroup({ children }: { children: ReactNode }) {
	return (
		<div className='divide-y divide-sf-border-subtle rounded-xl border border-sf-border-subtle bg-muted/15 px-3'>
			{children}
		</div>
	)
}
