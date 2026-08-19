import type { ReactNode, Ref } from 'react'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/base/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/components/base/empty'
import { entityBoardLoadingCardClass } from '@/shared/components/patterns/entity-board'
import {
	ROW_SHELL_BASE_CLASS,
	ROW_SHELL_SECTION_HEADER_CLASS,
} from '@/shared/components/patterns/row-tokens'

const BOARD_STACK_CLASS = 'flex min-h-0 flex-1 flex-col gap-0.5'
const BOARD_GROUP_HEADER_CLASS = `sticky top-0 z-10 ${ROW_SHELL_SECTION_HEADER_CLASS}`

export function BoardLoadingState({ label, className }: { label?: ReactNode; className?: string }) {
	if (label) {
		return (
			<EmptyPage aria-busy='true'>
				<div className={cn(entityBoardLoadingCardClass, className)}>{label}</div>
			</EmptyPage>
		)
	}

	return (
		<div aria-busy='true' className={cn(BOARD_STACK_CLASS, className)} data-board-loading='list'>
			{Array.from({ length: 2 }).map((_, sectionIndex) => (
				<div className='flex flex-col gap-0.5' key={`board-loading-section-${sectionIndex}`}>
					<div className={BOARD_GROUP_HEADER_CLASS}>
						<div className='size-3 rounded-sm bg-sf-surface-panel-muted' />
						<div className='h-3 w-24 rounded-full bg-sf-surface-panel-muted' />
					</div>
					<div className='flex flex-col gap-0.5'>
						{Array.from({ length: sectionIndex === 0 ? 4 : 3 }).map((_, rowIndex) => (
							<div
								className={ROW_SHELL_BASE_CLASS}
								key={`board-loading-row-${sectionIndex}-${rowIndex}`}
							>
								<div className='size-4 shrink-0 rounded-full bg-sf-surface-panel-muted' />
								<div className='h-3 min-w-0 flex-1 rounded-full bg-sf-surface-panel-muted' />
								<div className='h-3 w-12 shrink-0 rounded-full bg-sf-surface-panel-muted' />
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
		<EmptyPage>
			<Empty className={emptyClassName}>
				<EmptyHeader>
					<EmptyMedia variant='icon'>{icon}</EmptyMedia>
					<EmptyTitle>{title}</EmptyTitle>
					{description ? <EmptyDescription>{description}</EmptyDescription> : null}
				</EmptyHeader>
				{onAction && actionLabel ? (
					<EmptyContent>
						<Button ref={actionRef} onClick={onAction} type='button'>
							{actionLabel}
						</Button>
					</EmptyContent>
				) : null}
			</Empty>
		</EmptyPage>
	)
}
