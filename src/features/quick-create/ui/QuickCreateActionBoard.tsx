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
 * 这里开始真正接入 Board + Adapter，而不是继续拼私有列表 DOM。
 */
export type QuickCreateActionBoardMetrics = {
	contentHeight: number
}

type QuickCreateActionBoardProps = {
	isScrollLocked?: boolean
	onMetricsChange?: (metrics: QuickCreateActionBoardMetrics) => void
}

export function QuickCreateActionBoard({
	isScrollLocked = false,
	onMetricsChange,
}: QuickCreateActionBoardProps) {
	const { actions, derived, state } = useQuickCreate()
	const [taskSectionOpen, setTaskSectionOpen] = useState(true)
	const [projectSectionOpen, setProjectSectionOpen] = useState(true)
	const contentRef = useRef<HTMLDivElement | null>(null)

	const showRecentEmpty =
		derived.isShowingRecent &&
		derived.displayTasks.length === 0 &&
		derived.displayProjects.length === 0
	const showSearchingEmpty =
		derived.isSearchingMode &&
		!state.isSearching &&
		derived.displayTasks.length === 0 &&
		derived.displayProjects.length === 0
	const showSearchingPending =
		derived.isSearchingMode &&
		state.isSearching &&
		derived.displayTasks.length === 0 &&
		derived.displayProjects.length === 0

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
			className={cn(
				'w-full min-h-0',
				isScrollLocked ? 'flex-1 overflow-hidden' : 'shrink-0 overflow-visible',
			)}
			data-testid='quick-create-action-board'
		>
			<div
				className={cn(
					'w-full overflow-x-hidden',
					isScrollLocked ? 'no-scrollbar h-full min-h-0 overflow-y-auto' : 'overflow-visible',
				)}
			>
				<div className='flex w-full flex-col px-2 pb-0.5' ref={contentRef}>
					<BoardRoot className={cn(isScrollLocked ? null : '!flex-none')}>
						<QuickCreateCreateSection />
						{showSearchingPending ? (
							<QuickCreateBoardState isScrollLocked={isScrollLocked} label='正在搜索…' />
						) : showRecentEmpty ? (
							<QuickCreateBoardState isScrollLocked={isScrollLocked} label='还没有最近任务或项目' />
						) : showSearchingEmpty ? (
							<QuickCreateBoardState
								isScrollLocked={isScrollLocked}
								label={`没有匹配结果，按 Enter 创建“${state.draft.title.trim()}”。`}
							/>
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

function QuickCreateBoardState({
	isScrollLocked,
	label,
}: {
	isScrollLocked: boolean
	label: string
}) {
	return (
		<div
			className={cn(
				'min-h-44 px-5 py-6',
				isScrollLocked
					? 'flex flex-1 items-center justify-center'
					: 'flex items-center justify-center',
			)}
		>
			<div className='flex items-center gap-2 rounded-full border border-sf-border-subtle bg-muted/50 px-3 py-2 text-[12px] text-sf-text-secondary'>
				<SearchIcon className='size-4' />
				<span>{label}</span>
			</div>
		</div>
	)
}
