import { cn } from '@/shared/lib/utils'
import { launcherSurfaceClipClass } from '@/shared/components/patterns/launcher'

/**
 * Launcher 固定壳表面。
 * 深度用原生窗阴影；这里只负责材质、圆角裁切与显隐。
 */
export function LauncherSurface({
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
			aria-label='StoneFlow Launcher'
			className={cn(
				'relative z-10 h-full w-full min-h-0',
				isVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
				className,
			)}
			data-testid='launcher-surface'
		>
			<div className={launcherSurfaceClipClass}>{children}</div>
		</section>
	)
}
