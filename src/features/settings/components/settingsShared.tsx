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
			<Card className='gap-0'>
				<Card.Header className='flex flex-col items-start gap-1 px-4 pt-4 pb-0'>
					<h2 className='text-sm font-semibold text-foreground'>{title}</h2>
					<Card.Description className='text-xs leading-5 text-muted'>
						{description}
					</Card.Description>
				</Card.Header>
				<Card.Content className='px-4 pt-4 pb-4'>{children}</Card.Content>
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
			className='w-full py-3'
			isDisabled={disabled}
			isSelected={checked}
			onChange={onChange}
		>
			<Switch.Content className='flex w-full items-center gap-4'>
				<div className='min-w-0 flex-1 text-left'>
					<p className='text-sm font-medium text-foreground'>{label}</p>
					<p className='mt-1 text-xs leading-5 text-muted'>{description}</p>
				</div>
				<Switch.Control className='shrink-0'>
					<Switch.Thumb />
				</Switch.Control>
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
			<Card.Content className='p-3'>
				<p className='text-sm font-medium text-foreground'>{label}</p>
				<div className='mt-1 text-sm text-foreground'>{value}</div>
				<p className='mt-1 text-xs leading-5 text-muted'>{description}</p>
			</Card.Content>
		</Card>
	)
}

export function SettingsPreferenceGroup({ children }: { children: ReactNode }) {
	return (
		<Surface
			className='divide-y divide-separator rounded-lg border border-separator px-3'
			variant='secondary'
		>
			{children}
		</Surface>
	)
}
