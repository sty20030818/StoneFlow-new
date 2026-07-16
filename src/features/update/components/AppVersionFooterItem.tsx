/**
 * Footer 右侧：当前版本号（静默展示）。
 * Beta 渠道不再单独角标；若为 beta 构建，版本号本身会带后缀（如 1.0.0-beta.1）。
 */

import { useEffect, useState } from 'react'
import { getVersion } from '@tauri-apps/api/app'

import { shellFooterStaticTextClass } from '@/shared/components/patterns/shell-footer'
import { cn } from '@/shared/lib/utils'

export function AppVersionFooterItem() {
	const [version, setVersion] = useState<string | null>(null)

	useEffect(() => {
		let disposed = false

		void (async () => {
			try {
				const v = await getVersion()
				if (disposed) return
				setVersion(v)
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
			className={cn(shellFooterStaticTextClass, 'flex shrink-0 items-center tabular-nums')}
			title={`版本 ${version}`}
		>
			v{version}
		</span>
	)
}
