import { EmptyState } from '@heroui-pro/react'
import type { ReactNode } from 'react'

type RouterFeedbackPageProps = {
	title: string
	description?: ReactNode
	action?: ReactNode
}

export function RouterFeedbackPage({
	title,
	description = null,
	action = null,
}: RouterFeedbackPageProps) {
	return (
		<main className='flex min-h-screen items-center justify-center bg-background px-6'>
			<EmptyState className='w-full max-w-md'>
				<EmptyState.Header>
					<EmptyState.Title>{title}</EmptyState.Title>
					{description ? <EmptyState.Description>{description}</EmptyState.Description> : null}
				</EmptyState.Header>
				{action ? <EmptyState.Content>{action}</EmptyState.Content> : null}
			</EmptyState>
		</main>
	)
}
