import { Button } from '@heroui/react'
import { EmptyState } from '@heroui-pro/react'

import { MainCard } from '@/shared/components/main-card/MainCardLayout'

type TaskPageStateProps = {
	pageTitle?: string
	title: string
	description: string
	actionLabel?: string
	onAction?: () => void
}

export function TaskPageState({
	pageTitle = '任务详情',
	title,
	description,
	actionLabel,
	onAction,
}: TaskPageStateProps) {
	return (
		<MainCard.Root>
			<MainCard.Header title={pageTitle} />
			<MainCard.Body>
				<div className='flex min-h-full flex-1 items-center justify-center'>
					<EmptyState className='w-full max-w-xl'>
						<EmptyState.Header>
							<EmptyState.Title>{title}</EmptyState.Title>
							<EmptyState.Description>{description}</EmptyState.Description>
						</EmptyState.Header>
						{actionLabel && onAction ? (
							<EmptyState.Content>
								<Button onPress={onAction} type='button' variant='outline'>
									{actionLabel}
								</Button>
							</EmptyState.Content>
						) : null}
					</EmptyState>
				</div>
			</MainCard.Body>
		</MainCard.Root>
	)
}
