/**
 * 设置页「应用更新」区块容器：读写偏好 / 手动检查。
 * 选项卡 UI 见 UpdateSettingsSection.presentation。
 */

import { useCallback, useEffect, useState } from 'react'
import { RefreshCwIcon } from 'lucide-react'

import {
	ALLOWED_CHECK_INTERVAL_SECS,
	getUpdateSettings,
	setChannel,
	setCheckIntervalSecs,
	setCheckMode,
	type CheckIntervalSecs,
	type UpdateChannel,
	type UpdateCheckMode,
} from '../api/updates'
import { useManualUpdateCheck } from '../hooks/useManualUpdateCheck'
import { formFieldHintClass } from '@/shared/components/patterns/form-field'
import {
	settingsPanelDescriptionClass,
	settingsPanelHeaderWrapClass,
	settingsPanelSectionClass,
	settingsPanelTitleClass,
} from '@/shared/components/patterns/settings-panel'
import { Button } from '@/shared/components/base/button'
import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'
import { cn } from '@/shared/lib/utils'
import { StatusNotice } from '@/shared/components/StatusNotice'
import {
	UpdateChannelOptions,
	UpdateCheckModeOptions,
	UpdateIntervalOptions,
} from './UpdateSettingsSection.presentation'

export function UpdateSettingsSection() {
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [settings, setSettings] = useState<{
		checkMode: UpdateCheckMode
		channel: UpdateChannel
		checkIntervalSecs: number
	} | null>(null)
	const { checkNow, disabled, isChecking } = useManualUpdateCheck()

	const loadSettings = useCallback(async () => {
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
		} catch (err) {
			setError(normalizeTauriError(err, '读取更新设置失败'))
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void loadSettings()
	}, [loadSettings])

	async function handleCheckModeChange(mode: UpdateCheckMode) {
		if (!settings || settings.checkMode === mode) return
		setSaving(true)
		setError(null)
		try {
			await setCheckMode(mode)
			setSettings((prev) => (prev ? { ...prev, checkMode: mode } : prev))
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

				<UpdateCheckModeOptions
					value={settings?.checkMode}
					disabled={saving}
					onChange={(mode) => void handleCheckModeChange(mode)}
				/>

				<UpdateChannelOptions
					value={settings?.channel}
					disabled={saving}
					onChange={(channel) => void handleChannelChange(channel)}
				/>

				{settings?.checkMode !== 'manual' ? (
					<UpdateIntervalOptions
						value={settings?.checkIntervalSecs}
						disabled={saving}
						onChange={(intervalSecs) => void handleIntervalChange(intervalSecs)}
					/>
				) : null}

				<div className='flex items-center justify-between rounded-xl border border-sf-border-subtle bg-muted/25 p-4'>
					<div>
						<p className='text-sm font-medium text-foreground'>手动检查更新</p>
						<p className={cn(formFieldHintClass, 'mt-0.5')}>立即向服务器查询是否有新版本可用。</p>
					</div>
					<Button
						disabled={disabled || saving}
						onClick={() => void checkNow()}
						type='button'
						variant='default'
					>
						<RefreshCwIcon
							aria-hidden
							className={cn('-ml-0.5 mr-1.5 size-4', isChecking && 'animate-spin')}
						/>
						{isChecking ? '检查中...' : '检查更新'}
					</Button>
				</div>
			</div>
		</section>
	)
}
