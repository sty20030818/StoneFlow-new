/**
 * Shell 底栏 · 方案 A
 * 左：同步（灯 / 文案 / 按钮分离）
 * 右：更新事务 + 版本（无快捷键）
 */

import { SyncFooterStatusItem } from '@/features/sync'
import { AppVersionFooterItem } from '@/features/app-info'
import { UpdateStatusFooterItem } from '@/features/update'
import {
	shellFooterLeftTrackClass,
	shellFooterRightTrackClass,
} from '@/shared/components/patterns/shell-footer'

export function ShellFooter() {
	return (
		<footer className='relative z-32 isolate flex h-7 shrink-0 items-center justify-between gap-4 overflow-x-clip bg-surface-secondary px-3'>
			{/* 左：同步 */}
			<div className={shellFooterLeftTrackClass}>
				<SyncFooterStatusItem />
			</div>

			{/* 右：更新事务 · 版本 */}
			<div className={shellFooterRightTrackClass}>
				<UpdateStatusFooterItem />
				<AppVersionFooterItem />
			</div>
		</footer>
	)
}
