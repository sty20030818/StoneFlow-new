import { getSectionLabel, getSpaceLabel } from '@/app/layouts/shell/config'
import type { ShellSectionKey } from '@/app/layouts/shell/types'
import { useHealthcheckStatus } from '@/features/healthcheck/model/useHealthcheckStatus'

type ShellFooterProps = {
	currentSpaceId: string
	activeSection: ShellSectionKey
}

export function ShellFooter({ currentSpaceId, activeSection }: ShellFooterProps) {
	const healthcheckStatus = useHealthcheckStatus()

	return (
		<footer className='flex h-9.5 shrink-0 bg-(--sf-color-shell-chrome)'>
			<div className='flex w-(--sf-shell-sidebar-reserved-width) items-center gap-2 overflow-hidden px-3 transition-[width] duration-200 ease-out group-data-[sidebar-resizing=true]/sidebar-wrapper:transition-none group-data-[sidebar-layout=mobile]/sidebar-wrapper:hidden motion-reduce:transition-none'>
				<div className='flex min-w-0 items-center gap-2 text-[11px] text-(--sf-color-shell-tertiary)'>
					<span
						className={`size-1.5 shrink-0 rounded-full ${healthcheckStatus.indicatorClassName}`}
					/>
					<span className='truncate' title={healthcheckStatus.title}>
						{healthcheckStatus.label}
					</span>
				</div>
				<span
					className='ml-auto max-w-32 truncate text-[10px] text-(--sf-color-shell-tertiary)'
					title={healthcheckStatus.title}
				>
					{healthcheckStatus.detail}
				</span>
			</div>

			<div className='flex min-w-0 flex-1 items-center justify-between px-4'>
				<div className='flex min-w-0 items-center gap-3 text-[11px] text-(--sf-color-shell-tertiary)'>
					<span className='rounded-md border border-(--sf-color-border-subtle) bg-card px-2 py-1 text-[10.5px] text-(--sf-color-text-secondary)'>
						{getSpaceLabel(currentSpaceId)}
					</span>
					<span className='text-(--sf-color-border-strong)'>•</span>
					<span>{getSectionLabel(activeSection)}</span>
				</div>
				<div className='flex items-center gap-3 text-[11px] text-(--sf-color-shell-tertiary)'>
					<span>Views</span>
					<span className='text-(--sf-color-border-strong)'>•</span>
					<span>Cmd/Ctrl + K</span>
				</div>
			</div>
		</footer>
	)
}
