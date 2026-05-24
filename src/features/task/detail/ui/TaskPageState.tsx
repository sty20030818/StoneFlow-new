import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { Button } from '@/shared/ui/base/button'
import { StatusNotice } from '@/shared/ui/StatusNotice'

type TaskPageStateProps = {
	title: string
	description: string
	actionLabel?: string
	onAction?: () => void
}

export function TaskPageState({ title, description, actionLabel, onAction }: TaskPageStateProps) {
	return (
		<MainCard.Root>
			<MainCard.Header title='任务详情' />
			<MainCard.Body>
				<div className='flex min-h-full flex-1 items-center justify-center'>
					<div className='w-full max-w-xl'>
						<StatusNotice
							actions={
								actionLabel && onAction ? (
									<Button onClick={onAction} type='button' variant='outline'>
										{actionLabel}
									</Button>
								) : null
							}
							description={description}
							layout='split'
							title={title}
							variant='neutral'
						/>
					</div>
				</div>
			</MainCard.Body>
		</MainCard.Root>
	)
}
