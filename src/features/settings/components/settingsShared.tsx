import type { ReactNode } from 'react'
import { Surface, Switch } from '@heroui/react'

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
		<section className='grid min-w-0 gap-2.5'>
			<header className='grid gap-1 px-0.5'>
				<h2 className='text-[13px] font-semibold tracking-[-0.01em] text-foreground'>{title}</h2>
				<p className='max-w-3xl text-xs leading-5 text-muted'>{description}</p>
			</header>
			<Surface variant='secondary'>
				<div className='min-w-0 p-4'>{children}</div>
			</Surface>
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
				<div className='flex w-full items-center gap-5 py-2.5'>
					<div className='min-w-0 flex-1 text-left'>
						<p className='text-[13px] font-medium text-foreground'>{label}</p>
						<p className='mt-0.5 text-xs leading-5 text-muted'>{description}</p>
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
		<Surface variant='tertiary'>
			<div className='p-3'>
				<p className='text-sm font-medium text-foreground'>{label}</p>
				<div className='mt-1 text-sm text-foreground'>{value}</div>
				<p className='mt-1 text-xs leading-5 text-muted'>{description}</p>
			</div>
		</Surface>
	)
}

export function SettingsPreferenceGroup({ children }: { children: ReactNode }) {
	return <div className='divide-y divide-separator'>{children}</div>
}
