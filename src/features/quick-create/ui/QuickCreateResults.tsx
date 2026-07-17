import { useState } from 'react'

import { SearchIcon } from 'lucide-react'

import { useQuickCreate } from '@/features/quick-create/domain/QuickCreateDomainProvider'
import type {
	QuickCreateProjectItem,
	QuickCreateTaskItem,
} from '@/features/quick-create/model/types'
import { QuickCreateProjectResultsSection } from '@/features/quick-create/ui/QuickCreateProjectResultsSection'
import { QuickCreateTaskResultsSection } from '@/features/quick-create/ui/QuickCreateTaskResultsSection'
import { cn } from '@/shared/lib/utils'
import {
	quickCreateBoardResultsStackClass,
	quickCreateBoardStackClass,
} from '@/shared/components/patterns/quick-create'
import { BoardRoot } from '@/shared/components/board'

/**
 * Results 区内容：任务/项目列表与空状态。滚动由面板 Results 槽位负责。
 */
export function QuickCreateResults() {
	const { actions, derived, state } = useQuickCreate()
	const [taskSectionOpen, setTaskSectionOpen] = useState(true)
	const [projectSectionOpen, setProjectSectionOpen] = useState(true)

	const showRecentEmpty =
		derived.isShowingRecent &&
		derived.displayTasks.length === 0 &&
		derived.displayProjects.length === 0
	const showSearchingEmpty = derived.isSearchEmpty
	const showTaskBoard = !showRecentEmpty && !showSearchingEmpty && derived.displayTasks.length > 0
	const showProjectBoard =
		!showRecentEmpty && !showSearchingEmpty && derived.displayProjects.length > 0

	return (
		<div className='w-full px-2' data-testid='quick-create-action-board'>
			<BoardRoot className={quickCreateBoardStackClass}>
				{showRecentEmpty ? (
					<div data-testid='quick-create-empty-board-region'>
						<QuickCreateBoardState title='还没有最近任务或项目' />
					</div>
				) : showSearchingEmpty ? (
					<div data-testid='quick-create-empty-board-region'>
						<QuickCreateSearchEmptyState
							errorMessage={state.searchError}
							title={state.draft.title.trim()}
						/>
					</div>
				) : (
					<div className={quickCreateBoardResultsStackClass}>
						{showTaskBoard ? (
							<div data-testid='quick-create-task-board-region'>
								<QuickCreateTaskResultsSection
									activeIndex={derived.activeResultIndex}
									items={derived.displayTasks}
									onOpenChange={setTaskSectionOpen}
									onHover={actions.focusResult}
									onOpen={(item: QuickCreateTaskItem) =>
										void actions.openResult({ kind: 'task', ...item })
									}
									open={taskSectionOpen}
									testId={
										derived.isShowingRecent
											? 'quick-create-recent-tasks-section'
											: 'quick-create-tasks-section'
									}
									title={derived.isShowingRecent ? '最近任务' : '任务'}
								/>
							</div>
						) : null}
						{showProjectBoard ? (
							<div data-testid='quick-create-project-board-region'>
								<QuickCreateProjectResultsSection
									activeIndex={derived.activeResultIndex}
									baseIndex={derived.displayTasks.length}
									items={derived.displayProjects}
									onOpenChange={setProjectSectionOpen}
									onHover={actions.focusResult}
									onOpen={(item: QuickCreateProjectItem) =>
										void actions.openResult({ kind: 'project', ...item })
									}
									open={projectSectionOpen}
									testId={
										derived.isShowingRecent
											? 'quick-create-recent-projects-section'
											: 'quick-create-projects-section'
									}
									title={derived.isShowingRecent ? '最近项目' : '项目'}
								/>
							</div>
						) : null}
					</div>
				)}
			</BoardRoot>
		</div>
	)
}

function QuickCreateBoardState({ description, title }: { description?: string; title: string }) {
	return (
		<div className={cn('flex min-h-40 items-center justify-center px-5 py-6')}>
			<div className='flex items-center gap-2 rounded-full border border-sf-border-subtle bg-muted/50 px-3 py-2 text-[12px] text-sf-text-secondary'>
				<SearchIcon className='size-4' />
				<span>{title}</span>
				{description ? <span className='text-sf-text-quaternary'>{description}</span> : null}
			</div>
		</div>
	)
}

function QuickCreateSearchEmptyState({
	errorMessage,
	title,
}: {
	errorMessage?: string | null
	title: string
}) {
	return (
		<div className='px-3 pb-3 pt-2'>
			<div className='flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-sf-border-subtle bg-muted/30 px-5 py-6 text-center'>
				<div className='mb-3 flex size-9 items-center justify-center rounded-lg bg-background/80 text-sf-text-tertiary ring-1 ring-sf-border-subtle/80'>
					<SearchIcon className='size-4' />
				</div>
				<div className='text-[13px] font-medium text-foreground'>
					{errorMessage ? '搜索失败' : '没有匹配结果'}
				</div>
				<div className='mt-1 max-w-70 text-balance text-[12px] leading-5 text-sf-text-tertiary'>
					{errorMessage ?? '没有找到现有任务或项目，可以直接创建为新任务。'}
				</div>
				{errorMessage ? null : (
					<div className='mt-3 inline-flex items-center gap-1.5 rounded-full border border-sf-border-subtle bg-background/80 px-2.5 py-1 text-[11px] text-sf-text-quaternary'>
						<span className='font-medium text-sf-text-secondary'>Enter</span>
						<span>创建“{title}”</span>
					</div>
				)}
			</div>
		</div>
	)
}
