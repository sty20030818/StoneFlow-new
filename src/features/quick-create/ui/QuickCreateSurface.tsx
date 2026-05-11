import type { ComponentProps } from 'react'

import { cn } from '@/shared/lib/utils'

/**
 * Quick Create 外层视觉壳。
 * 这里只负责面板几何和分区容器，不承接输入、结果或提交逻辑。
 */
export function QuickCreateSurface({
	children,
	className,
	...props
}: ComponentProps<'section'>) {
	return (
		<section
			{...props}
			aria-label='StoneFlow Quick Create'
			className={cn(
				'relative z-10 flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background shadow-[0_0_28px_rgba(0,0,0,0.35)]',
				className,
			)}
			style={{ borderColor: '#bababa' }}
		>
			<div
				aria-hidden='true'
				className='pointer-events-none absolute inset-0 rounded-[14px]'
				style={{
					boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.9)',
				}}
			/>
			{children}
		</section>
	)
}
