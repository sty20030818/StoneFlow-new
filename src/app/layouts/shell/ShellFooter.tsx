import type { ShellSectionKey } from '@/app/layouts/shell/types'
import { useHealthcheckStatus } from '@/features/healthcheck/model/useHealthcheckStatus'
import { Kbd, KbdGroup } from '@/shared/ui/base/kbd'

type ShellNavBadges = Partial<Record<ShellSectionKey, string>>

type ShellFooterProps = {
	navBadges?: ShellNavBadges
}

export function ShellFooter({ navBadges = {} }: ShellFooterProps) {
	const healthcheckStatus = useHealthcheckStatus()

	return (
		<footer className='relative z-32 isolate flex h-7 shrink-0 items-center justify-between gap-3 overflow-x-clip bg-(--sf-color-shell-chrome) px-3'>
			<div className='flex min-w-0 flex-1 items-center gap-3 text-[11px] text-(--sf-color-shell-tertiary)'>
				<span
					className={`size-1.5 shrink-0 rounded-full ${healthcheckStatus.indicatorClassName}`}
					title={healthcheckStatus.title}
				/>
				{navBadges.inbox ? (
					<span className='flex items-center gap-1'>
						<span>收件箱</span>
						<span className='font-medium text-(--sf-color-shell-secondary)'>{navBadges.inbox}</span>
					</span>
				) : null}
				{navBadges.allTasks ? (
					<span className='flex items-center gap-1'>
						<span>任务</span>
						<span className='font-medium text-(--sf-color-shell-secondary)'>
							{navBadges.allTasks}
						</span>
					</span>
				) : null}
			</div>

			<div className='flex shrink-0 items-center gap-2 text-[11px] text-(--sf-color-shell-tertiary)'>
				<KbdGroup>
					<Kbd>⌘K</Kbd>
					<span>命令</span>
				</KbdGroup>
				<span className='text-(--sf-color-border-strong)'>·</span>
				<KbdGroup>
					<Kbd>C</Kbd>
					<span>新建</span>
				</KbdGroup>
			</div>
		</footer>
	)
}
