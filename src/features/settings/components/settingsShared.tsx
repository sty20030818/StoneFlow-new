import type { ReactNode } from 'react'
import { Card, Surface } from '@heroui/react'
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
	return (
		<section className='min-w-0'>
			<Card>
				<Card.Header>
					<div className='grid gap-1'>
						<Card.Title className='font-semibold tracking-[-0.01em]'>{title}</Card.Title>
						<Card.Description className='max-w-3xl text-xs'>{description}</Card.Description>
					</div>
				</Card.Header>
				<Card.Content>
					<div className='min-w-0'>{children}</div>
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
	onChange,
}: {
	label: string
	description: string
	isSelected: boolean
	isDisabled?: boolean
	onChange: (isSelected: boolean) => void
}) {
	return (
		<CellSwitch
			aria-label={label}
			className='w-full'
			isDisabled={isDisabled}
			isSelected={isSelected}
			onChange={onChange}
		>
			<CellSwitch.Trigger className='h-auto min-h-11 py-2.5'>
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
