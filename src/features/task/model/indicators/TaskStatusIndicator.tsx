import { useEffect, useRef, type ComponentType, type CSSProperties } from 'react'
import type { LucideProps } from 'lucide-react'
import { CircleCheckIcon, CircleIcon, CircleXIcon, PauseIcon, PlayIcon } from 'lucide-react'

import type { TaskStatus } from '@/shared/types'
import { cn } from '@/shared/lib/utils'

function SolidCircleIcon({
	icon: Icon,
	color,
	className,
}: {
	icon: ComponentType<LucideProps>
	color: string
	className?: string
}) {
	const ref = useRef<SVGSVGElement>(null)

	useEffect(() => {
		const svg = ref.current
		if (!svg) return
		const circle = svg.querySelector('circle')
		if (circle) svg.insertBefore(circle, svg.firstChild)
	}, [])

	return (
		<Icon
			className={cn(
				'size-4 shrink-0 [&_circle]:fill-(--sci-color) [&_circle]:stroke-none',
				className,
			)}
			fill='white'
			ref={ref}
			stroke='white'
			style={{ '--sci-color': color } as CSSProperties}
		/>
	)
}

/** 纯展示：任务状态指示器（无业务 hook；可供 metadata-fields 使用） */
export function TaskStatusIndicator({ status }: { status: TaskStatus }) {
	switch (status) {
		case 'done':
			return (
				<SolidCircleIcon icon={CircleCheckIcon} color='var(--color-sf-project-task-status-done)' />
			)
		case 'doing':
			return (
				<span className='flex size-4 shrink-0 items-center justify-center'>
					<PlayIcon className='size-3 text-sf-info-soft-text' fill='currentColor' />
				</span>
			)
		case 'waiting':
			return (
				<span className='flex size-4 shrink-0 items-center justify-center'>
					<PauseIcon className='size-3 text-sf-warning-soft-text' fill='currentColor' />
				</span>
			)
		case 'canceled':
			return <SolidCircleIcon icon={CircleXIcon} color='var(--color-sf-border-strong)' />
		default:
			return <CircleIcon className='size-4 shrink-0 text-sf-border-strong' />
	}
}
