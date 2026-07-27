/**
 * UpdateSettingsSection 纯展示：选项常量与选项卡 UI。
 * 容器负责读写设置 / 检查更新；本文件无副作用。
 */

import { formFieldHintClass } from '@/shared/components/patterns/form-field'
import { Badge } from '@/shared/components/base/badge'
import { cn } from '@/shared/lib/utils'
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
		<div className='grid gap-3'>
			<p className={cn(formFieldHintClass, 'text-foreground font-medium')}>更新检查方式</p>
			{CHECK_MODE_OPTIONS.map((option) => {
				const checked = value === option.value
				return (
					<label
						className={cn(
							'flex items-start gap-3 rounded-xl border border-sf-border-subtle bg-muted/25 p-3 transition-colors',
							disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-muted/45',
							checked && 'border-primary/40 bg-primary/5',
						)}
						key={option.value}
					>
						<input
							checked={checked}
							className='mt-1 size-4 accent-primary'
							disabled={disabled}
							name='update-check-mode'
							onChange={() => onChange(option.value)}
							type='radio'
						/>
						<div className='min-w-0'>
							<p className='text-sm font-medium text-foreground'>{option.label}</p>
							<p className={formFieldHintClass}>{option.description}</p>
						</div>
					</label>
				)
			})}
		</div>
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
		<div className='grid gap-3 pt-1'>
			<p className={cn(formFieldHintClass, 'text-foreground font-medium')}>更新渠道</p>
			<div className='grid gap-3 md:grid-cols-2'>
				{CHANNEL_OPTIONS.map((option) => {
					const checked = value === option.value
					return (
						<label
							className={cn(
								'flex items-start gap-3 rounded-xl border border-sf-border-subtle bg-muted/25 p-3 transition-colors',
								disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-muted/45',
								checked && 'border-primary/40 bg-primary/5',
							)}
							key={option.value}
						>
							<input
								checked={checked}
								className='mt-1 size-4 accent-primary'
								disabled={disabled}
								name='update-channel'
								onChange={() => onChange(option.value)}
								type='radio'
							/>
							<div className='min-w-0'>
								<p className='flex items-center gap-2 text-sm font-medium text-foreground'>
									{option.label}
									{option.badge ? (
										<Badge variant='warning' className='text-[10px] px-1 py-0'>
											{option.badge}
										</Badge>
									) : null}
								</p>
								<p className={formFieldHintClass}>{option.description}</p>
							</div>
						</label>
					)
				})}
			</div>
		</div>
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
		<div className='grid gap-3 pt-1'>
			<p className={cn(formFieldHintClass, 'text-foreground font-medium')}>自动检查间隔</p>
			<p className={formFieldHintClass}>启动约 3 秒后会检查一次；之后按此间隔定期检查。</p>
			<div className='flex flex-wrap gap-2'>
				{INTERVAL_OPTIONS.map((option) => {
					const checked = value === option.value
					return (
						<button
							key={option.value}
							type='button'
							disabled={disabled}
							onClick={() => onChange(option.value)}
							className={cn(
								'rounded-full border px-3 py-1.5 text-[13px] transition-colors',
								disabled && 'cursor-not-allowed opacity-70',
								checked
									? 'border-primary/40 bg-primary/10 font-medium text-foreground'
									: 'border-sf-border-subtle bg-muted/25 text-sf-shell-text-tertiary hover:bg-muted/45',
							)}
						>
							{option.label}
						</button>
					)
				})}
			</div>
		</div>
	)
}
