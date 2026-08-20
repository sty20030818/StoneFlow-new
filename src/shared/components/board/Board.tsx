import type { ReactNode, Ref } from 'react'
import { Button } from '@heroui/react'
import { EmptyState } from '@heroui-pro/react'

import { cn } from '@/shared/lib/utils'
import {
	ROW_SHELL_BASE_CLASS,
	ROW_SHELL_SECTION_HEADER_CLASS,
} from '@/shared/components/patterns/row-tokens'

const BOARD_STACK_CLASS = 'flex min-h-0 flex-1 flex-col gap-0.5'
const BOARD_GROUP_HEADER_CLASS = `sticky top-0 z-10 ${ROW_SHELL_SECTION_HEADER_CLASS}`

export function BoardLoadingState({ label, className }: { label?: ReactNode; className?: string }) {
	if (label) {
		return (
			<div aria-busy='true' className='flex min-h-0 min-w-0 flex-1 items-center justify-center'>
				<div
					className={cn(
						'rounded-lg border border-border bg-surface p-6 text-sm text-muted',
						className,
					)}
				>
					{label}
				</div>
			</div>
		)
	}

	return (
		<div aria-busy='true' className={cn(BOARD_STACK_CLASS, className)} data-board-loading='list'>
			{Array.from({ length: 2 }).map((_, sectionIndex) => (
				<div className='flex flex-col gap-0.5' key={`board-loading-section-${sectionIndex}`}>
					<div className={BOARD_GROUP_HEADER_CLASS}>
						<div className='size-3 rounded-sm bg-default' />
						<div className='h-3 w-24 rounded-full bg-default' />
					</div>
					<div className='flex flex-col gap-0.5'>
						{Array.from({ length: sectionIndex === 0 ? 4 : 3 }).map((_, rowIndex) => (
							<div
								className={ROW_SHELL_BASE_CLASS}
								key={`board-loading-row-${sectionIndex}-${rowIndex}`}
							>
								<div className='size-4 shrink-0 rounded-full bg-default' />
								<div className='h-3 min-w-0 flex-1 rounded-full bg-default' />
								<div className='h-3 w-12 shrink-0 rounded-full bg-default' />
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	)
}

export function BoardEmptyState({
	icon,
	title,
	description,
	actionLabel,
	onAction,
	actionRef,
	emptyClassName,
}: {
	icon: ReactNode
	title: ReactNode
	description?: ReactNode
	actionLabel?: string
	onAction?: () => void
	actionRef?: Ref<HTMLButtonElement>
	emptyClassName?: string
}) {
	return (
		<div className='flex min-h-0 min-w-0 flex-1 flex-col'>
			<EmptyState className={cn('w-full min-w-0 flex-1 justify-center', emptyClassName)} size='md'>
				<EmptyState.Header>
					<EmptyState.Media variant='icon'>{icon}</EmptyState.Media>
					<EmptyState.Title>{title}</EmptyState.Title>
					{description ? <EmptyState.Description>{description}</EmptyState.Description> : null}
				</EmptyState.Header>
				{onAction && actionLabel ? (
					<EmptyState.Content>
						<Button ref={actionRef} onPress={onAction} type='button' variant='primary'>
							{actionLabel}
						</Button>
					</EmptyState.Content>
				) : null}
			</EmptyState>
		</div>
	)
}
