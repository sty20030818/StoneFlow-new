import { Surface } from '@heroui/react'

import { cn } from '@/shared/lib/utils'

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
		<Surface
			aria-label='StoneFlow Launcher'
			className={cn(
				'relative z-10 flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[var(--launcher-panel-radius,8px)] border border-separator bg-surface [clip-path:inset(0_round_var(--launcher-panel-radius,8px))]',
				isVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
				className,
			)}
			data-testid='launcher-surface'
			role='region'
		>
			{children}
		</Surface>
	)
}
