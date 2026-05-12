import { useCallback, useEffect, useRef, useState } from 'react'

import { SearchIcon } from 'lucide-react'

import { useQuickCreate } from '@/features/quick-create/model/QuickCreateProvider'
import type {
	QuickCreateProjectItem,
	QuickCreateTaskItem,
} from '@/features/quick-create/model/types'
import { QuickCreateCreateSection } from '@/features/quick-create/ui/QuickCreateCreateSection'
import { QuickCreateProjectResultsSection } from '@/features/quick-create/ui/QuickCreateProjectResultsSection'
import { QuickCreateTaskResultsSection } from '@/features/quick-create/ui/QuickCreateTaskResultsSection'
import { cn } from '@/shared/lib/utils'
import { BoardRoot } from '@/shared/ui/board'

/**
 * ActionBoard 负责组织创建动作与结果分区。
 * 这里保持旧版 Board 视觉，但只向外报告自然高度，不再接管滚动上限。
 */
export type QuickCreateActionBoardMetrics = {
	contentHeight: number
}

type QuickCreateActionBoardProps = {
	onMetricsChange?: (metrics: QuickCreateActionBoardMetrics) => void
}

export function QuickCreateActionBoard({ onMetricsChange }: QuickCreateActionBoardProps) {
	const { actions, derived, state } = useQuickCreate()
	const [taskSectionOpen, setTaskSectionOpen] = useState(true)
	const [projectSectionOpen, setProjectSectionOpen] = useState(true)
	const contentRef = useRef<HTMLDivElement | null>(null)

	const showRecentEmpty =
		derived.isShowingRecent &&
		derived.displayTasks.length === 0 &&
		derived.displayProjects.length === 0
	const showSearchingEmpty = derived.isSearchEmpty

	const reportMetrics = useCallback(() => {
		onMetricsChange?.({
			contentHeight: Math.ceil(contentRef.current?.scrollHeight ?? 0),
		})
	}, [onMetricsChange])

	useEffect(() => {
		reportMetrics()
	}, [reportMetrics])

	useEffect(() => {
		if (typeof ResizeObserver === 'undefined') {
			return
		}

		const content = contentRef.current
		if (!content) {
			return
		}

		const observer = new ResizeObserver(() => {
			reportMetrics()
		})
		observer.observe(content)

		return () => {
			observer.disconnect()
		}
	}, [reportMetrics])

	return (
		<div
			className='w-full min-h-0 shrink-0 overflow-visible'
			data-testid='quick-create-action-board'
		>
			<div className='w-full overflow-x-hidden overflow-y-visible'>
				<div className='flex w-full flex-col px-2 pb-0.5' ref={contentRef}>
					<BoardRoot className='flex-none!'>
						<QuickCreateCreateSection />
						{showRecentEmpty ? (
							<QuickCreateBoardState title='还没有最近任务或项目' />
						) : showSearchingEmpty ? (
							<QuickCreateSearchEmptyState title={state.draft.title.trim()} />
						) : (
							<>
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
							</>
						)}
					</BoardRoot>
				</div>
			</div>
		</div>
	)
}

function QuickCreateBoardState({ description, title }: { description?: string; title: string }) {
	return (
		<div className={cn('min-h-44 px-5 py-6', 'flex items-center justify-center')}>
			<div className='flex items-center gap-2 rounded-full border border-sf-border-subtle bg-muted/50 px-3 py-2 text-[12px] text-sf-text-secondary'>
				<SearchIcon className='size-4' />
				<span>{title}</span>
				{description ? <span className='text-sf-text-quaternary'>{description}</span> : null}
			</div>
		</div>
	)
}

function QuickCreateSearchEmptyState({ title }: { title: string }) {
	return (
		<div className='px-3 pb-3 pt-2'>
			<div className='flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-sf-border-subtle bg-muted/30 px-5 py-6 text-center'>
				<div className='mb-3 flex size-9 items-center justify-center rounded-lg bg-background text-sf-text-tertiary shadow-sm ring-1 ring-sf-border-subtle/80'>
					<SearchIcon className='size-4' />
				</div>
				<div className='text-[13px] font-medium text-foreground'>没有匹配结果</div>
				<div className='mt-1 max-w-70 text-balance text-[12px] leading-5 text-sf-text-tertiary'>
					没有找到现有任务或项目，可以直接创建为新任务。
				</div>
				<div className='mt-3 inline-flex items-center gap-1.5 rounded-full border border-sf-border-subtle bg-background/80 px-2.5 py-1 text-[11px] text-sf-text-quaternary'>
					<span className='font-medium text-sf-text-secondary'>Enter</span>
					<span>创建“{title}”</span>
				</div>
			</div>
		</div>
	)
}
