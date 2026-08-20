/**
 * Shell 底栏 · 方案 A
 * 左：同步（灯 / 文案 / 按钮分离）
 * 右：更新事务 + 版本（无快捷键）
 */

import { SyncFooterStatusItem } from '@/features/sync'
import { AppVersionFooterItem } from '@/features/app-info'
import { UpdateStatusFooterItem } from '@/features/update'

export function ShellFooter() {
	return (
		<footer className='relative z-32 isolate flex h-7 shrink-0 items-center justify-between gap-4 overflow-x-clip bg-surface-secondary px-3'>
			{/* 左：同步 */}
			<div className='flex min-w-0 flex-1 items-center gap-2 text-[11px] leading-none text-muted'>
				<SyncFooterStatusItem />
			</div>

			{/* 右：更新事务 · 版本 */}
			<div className='flex shrink-0 items-center gap-3 text-[11px] leading-none text-muted'>
				<UpdateStatusFooterItem />
				<AppVersionFooterItem />
			</div>
		</footer>
	)
}
