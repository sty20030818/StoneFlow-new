/**
 * 设置页的"应用更新"设置区块。
 *
 * 提供更新检查模式选择、更新渠道选择、手动检查更新按钮。
 */

import { useEffect, useState } from 'react'
import { RefreshCwIcon } from 'lucide-react'

import {
	ALLOWED_CHECK_INTERVAL_SECS,
	checkUpdate,
	getUpdateSettings,
	setChannel,
	setCheckIntervalSecs,
	setCheckMode,
	type CheckIntervalSecs,
	type UpdateChannel,
	type UpdateCheckMode,
} from '@/features/update/api/updates'
import { useUpdateStore } from '@/features/update/model/useUpdateStore'
import { formFieldHintClass } from '@/shared/ui/patterns/form-field'
import {
	settingsPanelDescriptionClass,
	settingsPanelHeaderWrapClass,
	settingsPanelSectionClass,
	settingsPanelTitleClass,
} from '@/shared/ui/patterns/settings-panel'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'
import { cn } from '@/shared/lib/utils'
import { StatusNotice } from '@/shared/ui/StatusNotice'

const CHECK_MODE_OPTIONS: Array<{
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

const CHANNEL_OPTIONS: Array<{
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

const INTERVAL_OPTIONS: Array<{ value: CheckIntervalSecs; label: string }> = [
	{ value: 60 * 60, label: '每 1 小时' },
	{ value: 3 * 60 * 60, label: '每 3 小时' },
	{ value: 6 * 60 * 60, label: '每 6 小时' },
	{ value: 12 * 60 * 60, label: '每 12 小时' },
	{ value: 24 * 60 * 60, label: '每 24 小时' },
]

export function UpdateSettingsSection() {
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [checking, setChecking] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [checkResult, setCheckResult] = useState<{ found: boolean; version?: string } | null>(null)
	const [settings, setSettings] = useState<{
		checkMode: UpdateCheckMode
		channel: UpdateChannel
		checkIntervalSecs: number
	} | null>(null)
	const showAvailable = useUpdateStore((s) => s.showAvailable)
	const setStoreCheckMode = useUpdateStore((s) => s.setCheckMode)

	useEffect(() => {
		void loadSettings()
	}, [])

	async function loadSettings() {
		setLoading(true)
		setError(null)
		try {
			const s = await getUpdateSettings()
			const interval = ALLOWED_CHECK_INTERVAL_SECS.includes(
				s.checkIntervalSecs as CheckIntervalSecs,
			)
				? s.checkIntervalSecs
				: 6 * 60 * 60
			setSettings({
				checkMode: s.checkMode,
				channel: s.channel,
				checkIntervalSecs: interval,
			})
			setStoreCheckMode(s.checkMode)
		} catch (err) {
			setError(normalizeTauriError(err, '读取更新设置失败'))
		} finally {
			setLoading(false)
		}
	}

	async function handleCheckModeChange(mode: UpdateCheckMode) {
		if (!settings || settings.checkMode === mode) return
		setSaving(true)
		setError(null)
		try {
			await setCheckMode(mode)
			setSettings((prev) => (prev ? { ...prev, checkMode: mode } : prev))
			setStoreCheckMode(mode)
		} catch (err) {
			setError(normalizeTauriError(err, '保存更新模式失败'))
		} finally {
			setSaving(false)
		}
	}

	async function handleChannelChange(channel: UpdateChannel) {
		if (!settings || settings.channel === channel) return
		setSaving(true)
		setError(null)
		try {
			await setChannel(channel)
			setSettings((prev) => (prev ? { ...prev, channel } : prev))
		} catch (err) {
			setError(normalizeTauriError(err, '保存更新渠道失败'))
		} finally {
			setSaving(false)
		}
	}

	async function handleIntervalChange(intervalSecs: CheckIntervalSecs) {
		if (!settings || settings.checkIntervalSecs === intervalSecs) return
		setSaving(true)
		setError(null)
		try {
			await setCheckIntervalSecs(intervalSecs)
			setSettings((prev) => (prev ? { ...prev, checkIntervalSecs: intervalSecs } : prev))
		} catch (err) {
			setError(normalizeTauriError(err, '保存检查间隔失败'))
		} finally {
			setSaving(false)
		}
	}

	async function handleCheckNow() {
		setChecking(true)
		setError(null)
		setCheckResult(null)
		try {
			const info = await checkUpdate(true)
			if (info) {
				setCheckResult({ found: true, version: info.version })
				showAvailable(info, { openDialog: true })
			} else {
				setCheckResult({ found: false })
			}
		} catch (err) {
			setError(normalizeTauriError(err, '检查更新失败'))
		} finally {
			setChecking(false)
		}
	}

	if (loading) {
		return (
			<section className={settingsPanelSectionClass}>
				<div className={settingsPanelHeaderWrapClass}>
					<h2 className={settingsPanelTitleClass}>应用更新</h2>
					<p className={settingsPanelDescriptionClass}>加载中...</p>
				</div>
			</section>
		)
	}

	return (
		<section className={settingsPanelSectionClass}>
			<div className={settingsPanelHeaderWrapClass}>
				<h2 className={settingsPanelTitleClass}>应用更新</h2>
				<p className={settingsPanelDescriptionClass}>
					控制 StoneFlow 如何检查和安装更新。更新包从 release.sty20030818.space 的 Cloudflare R2
					分发。
				</p>
			</div>

			<div className='space-y-4'>
				{error ? (
					<StatusNotice
						className='text-sm'
						description={error}
						layout='split'
						role='alert'
						size='sm'
						title='更新设置出错'
						variant='danger'
					/>
				) : null}

				{checkResult && !checkResult.found ? (
					<StatusNotice
						className='text-sm'
						description='当前已是最新版本。'
						size='sm'
						title='已是最新'
						variant='success'
					/>
				) : null}

				{/* 更新模式 */}
				<div className='grid gap-3'>
					<p className={cn(formFieldHintClass, 'text-foreground font-medium')}>更新检查方式</p>
					{CHECK_MODE_OPTIONS.map((option) => {
						const checked = settings?.checkMode === option.value
						return (
							<label
								className={cn(
									'flex items-start gap-3 rounded-xl border border-sf-border-subtle bg-muted/25 p-3 transition-colors',
									saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-muted/45',
									checked && 'border-primary/40 bg-primary/5',
								)}
								key={option.value}
							>
								<input
									checked={checked}
									className='mt-1 size-4 accent-primary'
									disabled={saving}
									name='update-check-mode'
									onChange={() => void handleCheckModeChange(option.value)}
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

				{/* 更新渠道 */}
				<div className='grid gap-3 pt-1'>
					<p className={cn(formFieldHintClass, 'text-foreground font-medium')}>更新渠道</p>
					<div className='grid gap-3 md:grid-cols-2'>
						{CHANNEL_OPTIONS.map((option) => {
							const checked = settings?.channel === option.value
							return (
								<label
									className={cn(
										'flex items-start gap-3 rounded-xl border border-sf-border-subtle bg-muted/25 p-3 transition-colors',
										saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-muted/45',
										checked && 'border-primary/40 bg-primary/5',
									)}
									key={option.value}
								>
									<input
										checked={checked}
										className='mt-1 size-4 accent-primary'
										disabled={saving}
										name='update-channel'
										onChange={() => void handleChannelChange(option.value)}
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

				{/* 自动检查间隔：仅非手动模式有意义 */}
				{settings?.checkMode !== 'manual' ? (
					<div className='grid gap-3 pt-1'>
						<p className={cn(formFieldHintClass, 'text-foreground font-medium')}>
							自动检查间隔
						</p>
						<p className={formFieldHintClass}>
							启动约 3 秒后会检查一次；之后按此间隔定期检查。
						</p>
						<div className='flex flex-wrap gap-2'>
							{INTERVAL_OPTIONS.map((option) => {
								const checked = settings?.checkIntervalSecs === option.value
								return (
									<button
										key={option.value}
										type='button'
										disabled={saving}
										onClick={() => void handleIntervalChange(option.value)}
										className={cn(
											'rounded-full border px-3 py-1.5 text-[13px] transition-colors',
											saving && 'cursor-not-allowed opacity-70',
											checked
												? 'border-primary/40 bg-primary/10 font-medium text-foreground'
												: 'border-sf-border-subtle bg-muted/25 text-sf-shell-tertiary hover:bg-muted/45',
										)}
									>
										{option.label}
									</button>
								)
							})}
						</div>
					</div>
				) : null}

				{/* 手动检查更新 */}
				<div className='flex items-center justify-between rounded-xl border border-sf-border-subtle bg-muted/25 p-4'>
					<div>
						<p className='text-sm font-medium text-foreground'>手动检查更新</p>
						<p className={cn(formFieldHintClass, 'mt-0.5')}>立即向服务器查询是否有新版本可用。</p>
					</div>
					<Button
						disabled={checking || saving}
						onClick={() => void handleCheckNow()}
						type='button'
						variant='secondary'
					>
						<RefreshCwIcon
							aria-hidden
							className={cn('-ml-0.5 mr-1.5 size-4', checking && 'animate-spin')}
						/>
						{checking ? '检查中...' : '检查更新'}
					</Button>
				</div>
			</div>
		</section>
	)
}
