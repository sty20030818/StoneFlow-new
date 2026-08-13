import { useLauncher } from '../domain/LauncherDomainProvider'
import { cn } from '@/shared/lib/utils'

/** 连续创建提示条；挂在 Results 滚动区顶部，不撑外窗。 */
export function ContinuousToast() {
	const { derived, state } = useLauncher()

	if (!derived.continuousToastVisible) {
		return null
	}

	return (
		<div
			className={cn(
				'shrink-0 flex items-center gap-2 border-b border-sf-success-surface-border bg-sf-success-surface px-4 py-2 text-[11.5px] text-sf-success-surface-text',
			)}
		>
			<span className='rounded bg-legacy-background/65 px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums'>
				{state.continuousCreateCount}
			</span>
			<span>已连续创建 {state.continuousCreateCount} 条</span>
		</div>
	)
}
