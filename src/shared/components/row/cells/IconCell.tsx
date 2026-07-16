import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

/**
 * 行级实体图标槽：纯展示，尺寸与当前行级 metadata trigger 保持一致。
 * 不承载交互，仅用于 Leading 区显示 entity type icon。
 */
export type IconCellProps = {
	icon: ReactNode
	className?: string
}

export function IconCell({ icon, className }: IconCellProps) {
	return (
		<span
			className={cn(
				'flex size-5 shrink-0 items-center justify-center rounded-full text-foreground',
				className,
			)}
		>
			{icon}
		</span>
	)
}
