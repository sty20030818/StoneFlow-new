import { cn } from '@/shared/lib/utils'
import type { TaskPriority } from '@/shared/types'

const PRIORITY_ICON_SIZE_MAP = {
	sm: 14,
	md: 16,
} as const

type PriorityIconProps = {
	priority: TaskPriority
	size?: keyof typeof PRIORITY_ICON_SIZE_MAP
	className?: string
}

/**
 * 任务优先级图标统一走一套自绘 SVG，避免混用 Lucide 后风格发散。
 */
export function PriorityIcon({ priority, size = 'md', className }: PriorityIconProps) {
	const dimension = PRIORITY_ICON_SIZE_MAP[size]
	const stroke = 'var(--color-sf-main-icon-button-foreground)'
	const muted = 'var(--color-sf-priority-muted)'

	return (
		<svg
			aria-hidden
			className={cn('block shrink-0', className)}
			fill='none'
			height={dimension}
			viewBox='0 0 14 14'
			width={dimension}
		>
			{renderPriorityGlyph(priority, stroke, muted)}
		</svg>
	)
}

function renderPriorityGlyph(priority: TaskPriority, stroke: string, muted: string) {
	switch (priority) {
		case 1:
			return (
				<>
					<rect fill={stroke} height='4' rx='0.5' width='2.5' x='2' y='8' />
					<rect fill={muted} height='7' rx='0.5' width='2.5' x='6' y='5' />
					<rect fill={muted} height='10' rx='0.5' width='2.5' x='10' y='2' />
				</>
			)
		case 2:
			return (
				<>
					<rect fill={stroke} height='4' rx='0.5' width='2.5' x='2' y='8' />
					<rect fill={stroke} height='7' rx='0.5' width='2.5' x='6' y='5' />
					<rect fill={muted} height='10' rx='0.5' width='2.5' x='10' y='2' />
				</>
			)
		case 3:
			return (
				<>
					<rect fill={stroke} height='4' rx='0.5' width='2.5' x='2' y='8' />
					<rect fill={stroke} height='7' rx='0.5' width='2.5' x='6' y='5' />
					<rect fill={stroke} height='10' rx='0.5' width='2.5' x='10' y='2' />
				</>
			)
		case 4:
			return (
				<>
					<rect fill={stroke} height='12' rx='2.25' width='12' x='1' y='1' />
					<rect fill='white' height='5.25' rx='0.5' width='1.8' x='6.1' y='3' />
					<rect fill='white' height='1.8' rx='0.5' width='1.8' x='6.1' y='9.3' />
				</>
			)
		default:
			return (
				<>
					<rect fill={stroke} height='1.2' rx='0' width='2.2' x='1.7' y='6.3' />
					<rect fill={stroke} height='1.2' rx='0' width='2.2' x='5.9' y='6.3' />
					<rect fill={stroke} height='1.2' rx='0' width='2.2' x='10.1' y='6.3' />
				</>
			)
	}
}
