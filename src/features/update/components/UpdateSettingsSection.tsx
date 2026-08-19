import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Spinner } from '@heroui/react'
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
import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'
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
			<Alert aria-busy='true' aria-live='polite' role='status' status='accent'>
				<Alert.Indicator>
					<Spinner aria-hidden color='current' size='sm' />
				</Alert.Indicator>
				<Alert.Content>
					<Alert.Title>正在读取更新设置</Alert.Title>
					<Alert.Description>请稍候。</Alert.Description>
				</Alert.Content>
			</Alert>
		)
	}

	return (
		<div className='space-y-5'>
			{error ? (
				<Alert role='alert' status='danger'>
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>更新设置出错</Alert.Title>
						<Alert.Description>{error}</Alert.Description>
					</Alert.Content>
				</Alert>
			) : null}

			<UpdateCheckModeOptions
				disabled={saving}
				onChange={(mode) => void handleCheckModeChange(mode)}
				value={settings?.checkMode}
			/>

			<UpdateChannelOptions
				disabled={saving}
				onChange={(channel) => void handleChannelChange(channel)}
				value={settings?.channel}
			/>

			{settings?.checkMode !== 'manual' ? (
				<UpdateIntervalOptions
					disabled={saving}
					onChange={(intervalSecs) => void handleIntervalChange(intervalSecs)}
					value={settings?.checkIntervalSecs}
				/>
			) : null}

			<div className='flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center'>
				<div>
					<p className='text-sm font-medium text-foreground'>手动检查更新</p>
					<p className='mt-1 text-xs leading-5 text-muted'>立即向服务器查询是否有新版本可用。</p>
				</div>
				<Button
					isDisabled={disabled || saving}
					isPending={isChecking}
					onPress={() => void checkNow()}
					type='button'
				>
					{({ isPending }) => (
						<>
							{isPending ? (
								<Spinner aria-hidden color='current' size='sm' />
							) : (
								<RefreshCwIcon aria-hidden className='size-4' />
							)}
							{isPending ? '检查中...' : '检查更新'}
						</>
					)}
				</Button>
			</div>
		</div>
	)
}
