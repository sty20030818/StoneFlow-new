import { Chip, Description, Label, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { RadioButtonGroup } from '@heroui-pro/react'

import type { CheckIntervalSecs, UpdateChannel, UpdateCheckMode } from '../api/updates'

export const CHECK_MODE_OPTIONS: Array<{
	value: UpdateCheckMode
	label: string
	description: string
}> = [
	{
		value: 'manual',
		label: '手动检查',
		description: '只在你点击「检查更新」时查询。',
	},
	{
		value: 'notifyOnly',
		label: '仅提醒',
		description: '自动检查并提醒，由你决定是否下载。',
	},
	{
		value: 'autoDownload',
		label: '自动下载',
		description: '自动检查并后台下载，不会自动安装或重启。',
	},
]

export const CHANNEL_OPTIONS: Array<{
	value: UpdateChannel
	label: string
	description: string
	badge?: string
}> = [
	{ value: 'stable', label: '正式版', description: '稳定版本，适合日常使用。' },
	{
		value: 'beta',
		label: '测试版',
		description: '提前体验新功能，可能存在未修复的问题。',
		badge: 'Beta',
	},
]

export const INTERVAL_OPTIONS: Array<{ value: CheckIntervalSecs; label: string }> = [
	{ value: 60 * 60, label: '每 1 小时' },
	{ value: 3 * 60 * 60, label: '每 3 小时' },
	{ value: 6 * 60 * 60, label: '每 6 小时' },
	{ value: 12 * 60 * 60, label: '每 12 小时' },
	{ value: 24 * 60 * 60, label: '每 24 小时' },
]

export function UpdateCheckModeOptions({
	value,
	disabled,
	onChange,
}: {
	value: UpdateCheckMode
	disabled: boolean
	onChange: (mode: UpdateCheckMode) => void
}) {
	return (
		<RadioButtonGroup
			className='grid-cols-1 md:grid-cols-3'
			isDisabled={disabled}
			layout='grid'
			name='update-check-mode'
			onChange={(nextValue) => onChange(nextValue as UpdateCheckMode)}
			value={value}
		>
			<Label className='col-span-full'>更新检查方式</Label>
			{CHECK_MODE_OPTIONS.map((option) => (
				<RadioButtonGroup.Item key={option.value} value={option.value}>
					<RadioButtonGroup.Indicator />
					<RadioButtonGroup.ItemContent>
						<span className='text-sm font-medium text-foreground'>{option.label}</span>
						<Description>{option.description}</Description>
					</RadioButtonGroup.ItemContent>
				</RadioButtonGroup.Item>
			))}
		</RadioButtonGroup>
	)
}

export function UpdateChannelOptions({
	value,
	disabled,
	onChange,
}: {
	value: UpdateChannel
	disabled: boolean
	onChange: (channel: UpdateChannel) => void
}) {
	return (
		<RadioButtonGroup
			className='grid-cols-1 md:grid-cols-2'
			isDisabled={disabled}
			layout='grid'
			name='update-channel'
			onChange={(nextValue) => onChange(nextValue as UpdateChannel)}
			value={value}
		>
			<Label className='col-span-full'>更新渠道</Label>
			{CHANNEL_OPTIONS.map((option) => (
				<RadioButtonGroup.Item key={option.value} value={option.value}>
					<RadioButtonGroup.Indicator />
					<RadioButtonGroup.ItemContent>
						<span className='flex items-center gap-2 text-sm font-medium text-foreground'>
							{option.label}
							{option.badge ? (
								<Chip color='warning' size='sm' variant='soft'>
									{option.badge}
								</Chip>
							) : null}
						</span>
						<Description>{option.description}</Description>
					</RadioButtonGroup.ItemContent>
				</RadioButtonGroup.Item>
			))}
		</RadioButtonGroup>
	)
}

export function UpdateIntervalOptions({
	value,
	disabled,
	onChange,
}: {
	value: number
	disabled: boolean
	onChange: (intervalSecs: CheckIntervalSecs) => void
}) {
	return (
		<div className='grid gap-2'>
			<p className='text-sm font-medium text-foreground'>自动检查间隔</p>
			<p className='text-xs leading-5 text-muted'>
				启动约 3 秒后会检查一次；之后按此间隔定期检查。
			</p>
			<ToggleButtonGroup
				aria-label='自动检查间隔'
				disallowEmptySelection
				isDetached
				isDisabled={disabled}
				onSelectionChange={(keys) => {
					const selected = [...keys][0]
					const option = INTERVAL_OPTIONS.find((item) => String(item.value) === selected)
					if (option) onChange(option.value)
				}}
				selectedKeys={[String(value)]}
				selectionMode='single'
				size='sm'
			>
				{INTERVAL_OPTIONS.map((option) => (
					<ToggleButton id={String(option.value)} key={option.value}>
						{option.label}
					</ToggleButton>
				))}
			</ToggleButtonGroup>
		</div>
	)
}
