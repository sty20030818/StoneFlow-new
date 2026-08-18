import { CircleCheckIcon, CircleIcon, CircleXIcon, PauseIcon, PlayIcon } from 'lucide-react'

import type { TaskStatus } from '@/shared/types'

/** 纯展示：任务状态指示器（无业务 hook；可供 metadata-fields 使用） */
export function TaskStatusIndicator({ status }: { status: TaskStatus }) {
	switch (status) {
		case 'done':
			return (
				<CircleCheckIcon className='size-4 shrink-0 stroke-surface text-success [&_circle]:fill-current [&_circle]:stroke-none' />
			)
		case 'doing':
			return (
				<span className='flex size-4 shrink-0 items-center justify-center'>
					<PlayIcon className='size-3 text-info' fill='currentColor' />
				</span>
			)
		case 'waiting':
			return (
				<span className='flex size-4 shrink-0 items-center justify-center'>
					<PauseIcon className='size-3 text-warning' fill='currentColor' />
				</span>
			)
		case 'canceled':
			return (
				<CircleXIcon className='size-4 shrink-0 stroke-surface text-muted [&_circle]:fill-current [&_circle]:stroke-none' />
			)
		default:
			return <CircleIcon className='size-4 shrink-0 text-border-secondary' />
	}
}
