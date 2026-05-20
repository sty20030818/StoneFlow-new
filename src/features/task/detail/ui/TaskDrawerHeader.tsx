import { XIcon } from 'lucide-react'

import { Button } from '@/shared/ui/base/button'
import { DetailHeader } from '@/shared/ui/detail'

type TaskDrawerHeaderProps = {
	title: string
	onClose: () => void
}

export function TaskDrawerHeader({ title, onClose }: TaskDrawerHeaderProps) {
	return (
		<DetailHeader className='h-12 items-center justify-between py-0'>
			<div className='min-w-0'>
				<p className='truncate text-[13px] font-medium text-foreground'>{title || '未命名任务'}</p>
				<p className='text-[11px] text-sf-text-tertiary'>Task Detail</p>
			</div>
			<Button aria-label='关闭任务详情' className='size-7 p-0' onClick={onClose} size='icon' variant='ghost'>
				<XIcon className='size-4' />
			</Button>
		</DetailHeader>
	)
}
