/**
 * Footer 右侧：当前版本 + Beta 角标（静默展示）。
 */

import { useEffect, useState } from 'react'
import { getVersion } from '@tauri-apps/api/app'

import {
	getUpdateSettings,
	type UpdateChannel,
} from '@/features/update/api/updates'
import { shellFooterStaticTextClass } from '@/shared/ui/patterns/shell-footer'
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
			className={cn(shellFooterStaticTextClass, 'flex shrink-0 items-center gap-1 tabular-nums')}
			title={channel === 'beta' ? `测试版 ${version}` : `版本 ${version}`}
		>
			<span>v{version}</span>
			{channel === 'beta' ? (
				<span className='text-[10px] font-medium leading-none text-amber-700/90 dark:text-amber-400/90'>
					Beta
				</span>
			) : null}
		</span>
	)
}
