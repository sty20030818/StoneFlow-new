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
		<div className='flex min-h-screen items-center justify-center bg-background px-6'>
			<div className='flex w-full max-w-md flex-col items-center gap-3 text-center'>
				<h1 className='text-base font-semibold text-foreground'>{title}</h1>
				{description ? (
					<div className='text-sm leading-6 text-sf-shell-tertiary'>{description}</div>
				) : null}
				{action}
			</div>
		</div>
	)
}
