import { shellFooterStaticTextClass } from '@/shared/components/patterns/shell-footer'
import { cn } from '@/shared/lib/utils'

import { useAppVersion } from '../hooks/useAppVersion'

/** Footer 右侧的运行中应用版本号。 */
export function AppVersionFooterItem() {
	const { version } = useAppVersion()
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
