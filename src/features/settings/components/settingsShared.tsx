import { useId, type ReactNode } from 'react'
import { Card } from '@heroui/react'
import { CellSwitch } from '@heroui-pro/react'

export function SettingsStack({ children }: { children: ReactNode }) {
	return <div className='flex w-full min-w-0 flex-col gap-3'>{children}</div>
}

export function SettingsSection({
	title,
	description,
	children,
}: {
	title: string
	description: string
	children: ReactNode
}) {
	const headingId = useId()
	return (
		<section aria-labelledby={headingId} className='min-w-0'>
			<Card>
				<Card.Header>
					<div className='grid gap-1'>
						<h2 className='text-sm font-medium leading-6 text-foreground' id={headingId}>
							{title}
						</h2>
						<p className='text-xs leading-5 text-muted'>{description}</p>
					</div>
				</Card.Header>
				<Card.Content>
					<div className='grid min-w-0 gap-3'>{children}</div>
				</Card.Content>
			</Card>
		</section>
	)
}

export function SettingsToggleRow({
	label,
	description,
	isSelected,
	isDisabled,
	isPending,
	onChange,
}: {
	label: string
	description: string
	isSelected: boolean
	isDisabled?: boolean
	isPending?: boolean
	onChange: (isSelected: boolean) => void
}) {
	return (
		<CellSwitch
			aria-label={label}
			className='w-full'
			data-settings-toggle-row
			isDisabled={isDisabled}
			isReadOnly={isPending}
			isSelected={isSelected}
			onChange={onChange}
		>
			<CellSwitch.Trigger>
				<CellSwitch.Label className='whitespace-normal'>
					<span className='block text-[13px] font-medium text-foreground'>{label}</span>
					<span className='mt-0.5 block text-xs font-normal leading-5 text-muted'>
						{description}
					</span>
				</CellSwitch.Label>
				<CellSwitch.Control />
			</CellSwitch.Trigger>
		</CellSwitch>
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
		<div className='grid min-w-0 gap-1 py-3'>
			<dt className='text-xs font-medium text-muted'>{label}</dt>
			<dd className='text-sm text-foreground tabular-nums'>{value}</dd>
			<dd className='text-xs leading-5 text-muted'>{description}</dd>
		</div>
	)
}

export function SettingsPreferenceGroup({
	children,
	isPending,
}: {
	children: ReactNode
	isPending?: boolean
}) {
	return (
		<div aria-busy={isPending || undefined} className='divide-y divide-separator'>
			{children}
		</div>
	)
}
