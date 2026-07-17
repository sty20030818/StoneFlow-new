import { cn } from '@/shared/lib/utils'
import { quickCreateSurfaceClipClass } from '@/shared/components/patterns/quick-create'

/**
 * Quick Create 固定壳表面。
 * 深度用原生窗阴影；这里只负责材质、圆角裁切与显隐。
 */
export function QuickCreateSurface({
	children,
	className,
	isVisible,
}: {
	children: React.ReactNode
	className?: string
	isVisible: boolean
}) {
	return (
		<section
			aria-label='StoneFlow Quick Create'
			className={cn(
				'relative z-10 h-full w-full min-h-0',
				'transition-opacity duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
				isVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
				className,
			)}
			data-testid='quick-create-surface'
		>
			<div className={quickCreateSurfaceClipClass}>{children}</div>
		</section>
	)
}
