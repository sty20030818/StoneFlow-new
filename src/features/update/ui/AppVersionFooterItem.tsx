/**
 * Footer 右侧：当前应用版本 + 渠道角标（Beta）。
 */

import { useEffect, useState } from 'react'
import { getVersion } from '@tauri-apps/api/app'

import {
	getUpdateSettings,
	type UpdateChannel,
} from '@/features/update/api/updates'
import { cn } from '@/shared/lib/utils'

export function AppVersionFooterItem() {
	const [version, setVersion] = useState<string | null>(null)
	const [channel, setChannel] = useState<UpdateChannel | null>(null)

	useEffect(() => {
		let disposed = false

		void (async () => {
			try {
				const [v, settings] = await Promise.all([
					getVersion(),
					getUpdateSettings().catch(() => null),
				])
				if (disposed) return
				setVersion(v)
				if (settings) setChannel(settings.channel)
			} catch {
				// non-tauri / 测试环境忽略
			}
		})()

		return () => {
			disposed = true
		}
	}, [])

	if (!version) return null

	return (
		<span
			className={cn(
				'flex shrink-0 items-center gap-1 tabular-nums text-[11px] text-sf-shell-text-tertiary',
			)}
			title={channel === 'beta' ? `测试版 ${version}` : `版本 ${version}`}
		>
			<span>v{version}</span>
			{channel === 'beta' ? (
				<span className='rounded px-1 py-px text-[10px] font-medium leading-none text-amber-700 dark:text-amber-400'>
					Beta
				</span>
			) : null}
		</span>
	)
}
