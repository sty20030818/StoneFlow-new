import type { ReactNode } from 'react'
import { Card, Surface, Switch } from '@heroui/react'

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
		<section>
			<Card>
				<Card.Header>
					<h2 className='text-sm font-semibold text-foreground'>{title}</h2>
					<Card.Description>{description}</Card.Description>
				</Card.Header>
				<Card.Content>{children}</Card.Content>
			</Card>
		</section>
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
	return (
		<Switch
			aria-label={label}
			className='w-full'
			isDisabled={disabled}
			isSelected={checked}
			onChange={onChange}
		>
			<Switch.Content>
				<div className='flex w-full items-center gap-4 py-3'>
					<div className='min-w-0 flex-1 text-left'>
						<p className='text-sm font-medium text-foreground'>{label}</p>
						<p className='mt-1 text-xs leading-5 text-muted'>{description}</p>
					</div>
					<Switch.Control>
						<Switch.Thumb />
					</Switch.Control>
				</div>
			</Switch.Content>
		</Switch>
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
		<Card variant='tertiary'>
			<Card.Content>
				<p className='text-sm font-medium text-foreground'>{label}</p>
				<div className='mt-1 text-sm text-foreground'>{value}</div>
				<p className='mt-1 text-xs leading-5 text-muted'>{description}</p>
			</Card.Content>
		</Card>
	)
}

export function SettingsPreferenceGroup({ children }: { children: ReactNode }) {
	return (
		<Surface variant='secondary'>
			<div className='divide-y divide-separator px-3'>{children}</div>
		</Surface>
	)
}
