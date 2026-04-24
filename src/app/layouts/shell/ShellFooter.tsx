import { getSectionLabel, getSpaceLabel } from '@/app/layouts/shell/config'
import type { ShellSectionKey } from '@/app/layouts/shell/types'
import { useHealthcheckStatus } from '@/features/healthcheck/model/useHealthcheckStatus'

type ShellFooterProps = {
	currentSpaceId: string
	activeSection: ShellSectionKey
}

/**
 * Shell 底栏：与侧栏宽度/展开状态解耦，全宽单行，避免随 sidebar reserved 列伸缩。
 */
export function ShellFooter({ currentSpaceId, activeSection }: ShellFooterProps) {
	const healthcheckStatus = useHealthcheckStatus()

	return (
		<footer className='relative z-32 isolate flex h-9.5 shrink-0 items-center justify-between gap-3 overflow-x-clip bg-(--sf-color-shell-chrome) px-4 shadow-none'>
			<div className='flex min-w-0 flex-1 items-center gap-2 text-[11px] text-(--sf-color-shell-tertiary)'>
				<span
					className={`size-1.5 shrink-0 rounded-full ${healthcheckStatus.indicatorClassName}`}
				/>
				<span className='min-w-0 truncate' title={healthcheckStatus.title}>
					{healthcheckStatus.label}
				</span>
				<span
					className='hidden max-w-[40%] truncate text-[10px] sm:inline'
					title={healthcheckStatus.title}
				>
					{healthcheckStatus.detail}
				</span>
			</div>

			<div className='flex min-w-0 shrink-0 items-center gap-2 text-[11px] text-(--sf-color-shell-tertiary) sm:gap-3'>
				<span className='rounded-md border border-(--sf-color-border-subtle) bg-card px-2 py-1 text-[10.5px] text-(--sf-color-text-secondary)'>
					{getSpaceLabel(currentSpaceId)}
				</span>
				<span className='text-(--sf-color-border-strong)'>•</span>
				<span className='max-w-[28vw] truncate sm:max-w-none'>{getSectionLabel(activeSection)}</span>
			</div>

			<div className='hidden items-center gap-3 text-[11px] text-(--sf-color-shell-tertiary) sm:flex'>
				<span>Views</span>
				<span className='text-(--sf-color-border-strong)'>•</span>
				<span>Cmd/Ctrl + K</span>
			</div>
		</footer>
	)
}
