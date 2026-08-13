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
		<div className='flex min-h-screen items-center justify-center bg-legacy-background px-6'>
			<div className='flex w-full max-w-md flex-col items-center gap-3 text-center'>
				<h1 className='text-base font-semibold text-legacy-foreground'>{title}</h1>
				{description ? (
					<div className='text-sm leading-6 text-sf-shell-text-tertiary'>{description}</div>
				) : null}
				{action}
			</div>
		</div>
	)
}
