import type { ShellSectionKey } from '@/app/layouts/shell/types'
import { useHealthcheckStatus } from '@/features/healthcheck/model/useHealthcheckStatus'
import { SyncFooterStatusItem } from '@/features/sync/ui/SyncFooterStatusItem'
import { AppVersionFooterItem } from '@/features/update/ui/AppVersionFooterItem'
import { UpdateStatusFooterItem } from '@/features/update/ui/UpdateStatusFooterItem'
import { Kbd, KbdGroup } from '@/shared/ui/base/kbd'
import {
	shellFooterBadgePairClass,
	shellFooterBadgeValueClass,
	shellFooterLeftTrackClass,
	shellFooterRightTrackClass,
} from '@/shared/ui/patterns/shell-footer'

type ShellNavBadges = Partial<Record<ShellSectionKey, string>>

type ShellFooterProps = {
	navBadges?: ShellNavBadges
}

export function ShellFooter({ navBadges = {} }: ShellFooterProps) {
	const healthcheckStatus = useHealthcheckStatus()

	return (
		<footer className='relative z-32 isolate flex h-7 shrink-0 items-center justify-between gap-3 overflow-x-clip bg-sf-shell px-3'>
			<div className={shellFooterLeftTrackClass}>
				<span
					className={`size-1.5 shrink-0 rounded-full ${healthcheckStatus.indicatorClassName}`}
					title={healthcheckStatus.title}
				/>
				<SyncFooterStatusItem />
				<UpdateStatusFooterItem />
				{navBadges.inbox ? (
					<span className={shellFooterBadgePairClass}>
						<span>收件箱</span>
						<span className={shellFooterBadgeValueClass}>{navBadges.inbox}</span>
					</span>
				) : null}
				{navBadges.tasks ? (
					<span className={shellFooterBadgePairClass}>
						<span>任务</span>
						<span className={shellFooterBadgeValueClass}>{navBadges.tasks}</span>
					</span>
				) : null}
			</div>

			<div className={shellFooterRightTrackClass}>
				<AppVersionFooterItem />
				<span className='text-sf-border-strong max-sm:hidden' aria-hidden>
					·
				</span>
				<KbdGroup className='max-sm:hidden'>
					<Kbd>⌘K</Kbd>
					<span className='max-md:hidden'>命令</span>
				</KbdGroup>
				<span className='text-sf-border-strong max-sm:hidden' aria-hidden>
					·
				</span>
				<KbdGroup className='max-sm:hidden'>
					<Kbd>C</Kbd>
					<span className='max-md:hidden'>新建</span>
				</KbdGroup>
			</div>
		</footer>
	)
}
