import { useLauncher } from '@/features/launcher/domain/LauncherDomainProvider'
import type {
	LauncherProjectItem,
	LauncherResultItem,
	LauncherTaskItem,
} from '@/features/launcher/model/types'
import { EmptyHint, SearchEmptyHint } from '@/features/launcher/results/EmptyHint'
import { ProjectResultRowAdapter } from '@/features/launcher/results/adapters/ProjectResultRowAdapter'
import { TaskResultRowAdapter } from '@/features/launcher/results/adapters/TaskResultRowAdapter'
import { SectionLabel } from '@/features/launcher/results/SectionLabel'
import { launcherResultsStackClass } from '@/shared/components/patterns/launcher'

/**
 * Results：空态 5+5 轻标题；搜索统一流。
 */
export function LauncherResults() {
	const { actions, derived, state } = useLauncher()

	if (derived.mode === 'recent-empty') {
		return (
			<div data-testid='launcher-empty-region'>
				<EmptyHint title='输入标题创建或搜索' />
			</div>
		)
	}

	if (derived.mode === 'search-empty') {
		return (
			<div data-testid='launcher-empty-region'>
				<SearchEmptyHint errorMessage={state.searchError} title={state.draft.title.trim()} />
			</div>
		)
	}

	if (derived.mode === 'recent') {
		return (
			<div className={launcherResultsStackClass} data-testid='launcher-results'>
				{derived.displayTasks.length > 0 ? (
					<div data-testid='launcher-recent-tasks-section'>
						<SectionLabel count={derived.displayTasks.length} title='最近任务' />
						{derived.displayTasks.map((item, index) => (
							<TaskResultRowAdapter
								index={index}
								isActive={derived.activeResultIndex === index}
								item={item}
								key={item.id}
								onHover={actions.focusResult}
								onOpen={(task: LauncherTaskItem) =>
									void actions.openResult({ kind: 'task', ...task })
								}
							/>
						))}
					</div>
				) : null}
				{derived.displayProjects.length > 0 ? (
					<div className='pt-1' data-testid='launcher-recent-projects-section'>
						<SectionLabel count={derived.displayProjects.length} title='最近项目' />
						{derived.displayProjects.map((item, index) => {
							const absoluteIndex = derived.displayTasks.length + index
							return (
								<ProjectResultRowAdapter
									index={absoluteIndex}
									isActive={derived.activeResultIndex === absoluteIndex}
									item={item}
									key={item.id}
									onHover={actions.focusResult}
									onOpen={(project: LauncherProjectItem) =>
										void actions.openResult({ kind: 'project', ...project })
									}
								/>
							)
						})}
					</div>
				) : null}
			</div>
		)
	}

	// search：统一流
	return (
		<div className={launcherResultsStackClass} data-testid='launcher-results'>
			<div data-testid='launcher-search-results'>
				{derived.flatItems.map((item, index) => (
					<SearchResultRow
						activeIndex={derived.activeResultIndex}
						item={item}
						key={`${item.kind}-${item.id}`}
						index={index}
						onHover={actions.focusResult}
						onOpen={actions.openResult}
					/>
				))}
			</div>
		</div>
	)
}

function SearchResultRow({
	item,
	index,
	activeIndex,
	onHover,
	onOpen,
}: {
	item: LauncherResultItem
	index: number
	activeIndex: number
	onHover: (index: number) => void
	onOpen: (item: LauncherResultItem) => void
}) {
	if (item.kind === 'task') {
		return (
			<TaskResultRowAdapter
				index={index}
				isActive={activeIndex === index}
				item={item}
				onHover={onHover}
				onOpen={(task) => void onOpen({ kind: 'task', ...task })}
			/>
		)
	}

	return (
		<ProjectResultRowAdapter
			index={index}
			isActive={activeIndex === index}
			item={item}
			onHover={onHover}
			onOpen={(project) => void onOpen({ kind: 'project', ...project })}
		/>
	)
}
