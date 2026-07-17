import { cn } from '@/shared/lib/utils'

/**
 * Quick Create 固定壳表面：透明底 + hairline，深度交给系统阴影。
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
				'relative z-10 flex h-full w-full min-h-0 flex-col overflow-hidden rounded-xl border border-black/8 bg-transparent',
				'transition-opacity duration-150',
				isVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
				className,
			)}
			data-testid='quick-create-surface'
		>
			{children}
		</section>
	)
}
