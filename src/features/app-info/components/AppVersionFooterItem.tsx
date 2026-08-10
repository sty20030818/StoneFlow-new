import { shellFooterStaticTextClass } from '@/shared/components/patterns/shell-footer'
import { ActionTooltip } from '@/shared/components/tooltip'
import { cn } from '@/shared/lib/utils'

import { useAppVersion } from '../hooks/useAppVersion'

/** Footer 右侧的运行中应用版本号。 */
export function AppVersionFooterItem() {
	const { version } = useAppVersion()
	if (!version) return null
	const label = `版本 ${version}`

	return (
		<ActionTooltip>
			<ActionTooltip.Trigger asChild>
				<span
					aria-label={label}
					className={cn(
						shellFooterStaticTextClass,
						'flex shrink-0 items-center rounded-sm tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-ring',
					)}
					tabIndex={0}
				>
					v{version}
				</span>
			</ActionTooltip.Trigger>
			<ActionTooltip.Content>
				<ActionTooltip.Row label={label} />
			</ActionTooltip.Content>
		</ActionTooltip>
	)
}
