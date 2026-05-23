import { forwardRef, type ComponentProps } from 'react'

import { cn } from '@/shared/lib/utils'

type QuickCreateSurfaceProps = Omit<ComponentProps<'section'>, 'ref'> & {
	isScrollLocked?: boolean
}

/**
 * Quick Create 外层视觉壳。
 * 这里只负责面板几何和分区容器，不承接输入、结果或提交逻辑。
 */
export const QuickCreateSurface = forwardRef<HTMLElement, QuickCreateSurfaceProps>(
	function QuickCreateSurface({ children, className, isScrollLocked = false, ...props }, ref) {
		return (
			<section
				{...props}
				aria-label='StoneFlow Quick Create'
				className={cn(
					'relative z-10 flex w-full flex-col overflow-hidden rounded-xl border bg-background shadow-[0_0_28px_rgba(0,0,0,0.35)]',
					isScrollLocked ? 'max-h-full shrink-0 self-start' : 'shrink-0 self-start',
					className,
				)}
				ref={ref}
				style={{ borderColor: '#bababa' }}
			>
				{children}
			</section>
		)
	},
)
