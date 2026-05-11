import { useState } from 'react'

import { SearchIcon } from 'lucide-react'

import { useQuickCreate } from '@/features/quick-create/model/QuickCreateProvider'
import type {
	QuickCreateProjectItem,
	QuickCreateTaskItem,
} from '@/features/quick-create/model/types'
import { QuickCreateCreateSection } from '@/features/quick-create/ui/QuickCreateCreateSection'
import { QuickCreateProjectResultsSection } from '@/features/quick-create/ui/QuickCreateProjectResultsSection'
import { QuickCreateTaskResultsSection } from '@/features/quick-create/ui/QuickCreateTaskResultsSection'
import { BoardRoot } from '@/shared/ui/board'

/**
 * ActionBoard 负责组织创建动作与结果分区。
 * 这里开始真正接入 Board + Adapter，而不是继续拼私有列表 DOM。
 */
export function QuickCreateActionBoard() {
	const { actions, derived, state } = useQuickCreate()
	const [taskSectionOpen, setTaskSectionOpen] = useState(true)
	const [projectSectionOpen, setProjectSectionOpen] = useState(true)

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

	return (
		<div className='min-h-0 flex-1 overflow-hidden' data-testid='quick-create-action-board'>
			<div className='flex h-full min-h-0 flex-col overflow-y-auto px-2 pb-1'>
				<BoardRoot className='gap-0'>
					<QuickCreateCreateSection />
					{showSearchingPending ? (
						<QuickCreateBoardState label='正在搜索…' />
					) : showRecentEmpty ? (
						<QuickCreateBoardState label='还没有最近任务或项目' />
					) : showSearchingEmpty ? (
						<QuickCreateBoardState
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
	)
}

function QuickCreateBoardState({ label }: { label: string }) {
	return (
		<div className='flex min-h-44 flex-1 items-center justify-center px-5 py-6'>
			<div className='flex items-center gap-2 rounded-full border border-sf-border-subtle bg-muted/50 px-3 py-2 text-[12px] text-sf-text-secondary'>
				<SearchIcon className='size-4' />
				<span>{label}</span>
			</div>
		</div>
	)
}
