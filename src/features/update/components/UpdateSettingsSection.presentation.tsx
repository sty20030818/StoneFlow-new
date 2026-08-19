import {
	Chip,
	Description,
	Label,
	Radio,
	RadioGroup,
	ToggleButton,
	ToggleButtonGroup,
} from '@heroui/react'

import type { CheckIntervalSecs, UpdateChannel, UpdateCheckMode } from '../api/updates'

export const CHECK_MODE_OPTIONS: Array<{
	value: UpdateCheckMode
	label: string
	description: string
}> = [
	{
		value: 'manual',
		label: '手动检查',
		description: '不自动检查。仅在你点击「检查更新」时查询。',
	},
	{
		value: 'notifyOnly',
		label: '仅提醒',
		description: '启动后及定期自动检查。发现更新时弹窗提醒，由你决定是否下载。',
	},
	{
		value: 'autoDownload',
		label: '自动下载',
		description:
			'自动检查并在后台静默下载（不会自动安装/自动重启）。下载完成后底部悬浮栏提示，由你决定何时重启生效。',
	},
]

export const CHANNEL_OPTIONS: Array<{
	value: UpdateChannel
	label: string
	description: string
	badge?: string
}> = [
	{ value: 'stable', label: '正式版', description: '只接收经过测试的稳定版本，推荐日常使用。' },
	{
		value: 'beta',
		label: '测试版',
		description: '接收最新的测试版本，可能包含实验性功能和未修复的问题。',
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
	value: UpdateCheckMode | undefined
	disabled: boolean
	onChange: (mode: UpdateCheckMode) => void
}) {
	return (
		<RadioGroup
			className='gap-3'
			isDisabled={disabled}
			name='update-check-mode'
			onChange={(nextValue) => onChange(nextValue as UpdateCheckMode)}
			value={value}
			variant='secondary'
		>
			<Label>更新检查方式</Label>
			{CHECK_MODE_OPTIONS.map((option) => {
				return (
					<Radio key={option.value} value={option.value}>
						<Radio.Content>
							<Radio.Control>
								<Radio.Indicator />
							</Radio.Control>
							{option.label}
						</Radio.Content>
						<Description>{option.description}</Description>
					</Radio>
				)
			})}
		</RadioGroup>
	)
}

export function UpdateChannelOptions({
	value,
	disabled,
	onChange,
}: {
	value: UpdateChannel | undefined
	disabled: boolean
	onChange: (channel: UpdateChannel) => void
}) {
	return (
		<RadioGroup
			className='grid gap-3 md:grid-cols-2'
			isDisabled={disabled}
			name='update-channel'
			onChange={(nextValue) => onChange(nextValue as UpdateChannel)}
			value={value}
			variant='secondary'
		>
			<Label className='md:col-span-2'>更新渠道</Label>
			{CHANNEL_OPTIONS.map((option) => (
				<Radio key={option.value} value={option.value}>
					<Radio.Content>
						<Radio.Control>
							<Radio.Indicator />
						</Radio.Control>
						<span className='flex items-center gap-2'>
							{option.label}
							{option.badge ? (
								<Chip color='warning' size='sm' variant='soft'>
									{option.badge}
								</Chip>
							) : null}
						</span>
					</Radio.Content>
					<Description>{option.description}</Description>
				</Radio>
			))}
		</RadioGroup>
	)
}

export function UpdateIntervalOptions({
	value,
	disabled,
	onChange,
}: {
	value: number | undefined
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
				selectedKeys={value === undefined ? [] : [String(value)]}
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
