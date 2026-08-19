import { useCallback, useEffect, useRef } from 'react'

import { useLauncher } from '../domain/LauncherDomainProvider'
import { getLauncherResultKey, type LauncherResultItem } from '../model/types'
import { EmptyHint, SearchEmptyHint } from './EmptyHint'
import { ProjectResultRowAdapter } from './adapters/ProjectResultRowAdapter'
import { TaskResultRowAdapter } from './adapters/TaskResultRowAdapter'
import { SectionLabel } from './SectionLabel'

/**
 * Results：空态 5+5 轻标题；搜索统一流。
 */
export function LauncherResults() {
	const { derived, state } = useLauncher()

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
			<div
				aria-label='Launcher 结果'
				className='flex flex-col gap-0.5 px-2 pb-0.5'
				data-testid='launcher-results'
				role='list'
			>
				{derived.displayTasks.length > 0 ? (
					<div data-testid='launcher-recent-tasks-section'>
						<SectionLabel count={derived.displayTasks.length} title='最近任务' />
						{derived.displayTasks.map((item) => (
							<LauncherResultRow item={{ kind: 'task', ...item }} key={`task:${item.id}`} />
						))}
					</div>
				) : null}
				{derived.displayProjects.length > 0 ? (
					<div className='pt-1' data-testid='launcher-recent-projects-section'>
						<SectionLabel count={derived.displayProjects.length} title='最近项目' />
						{derived.displayProjects.map((item) => (
							<LauncherResultRow item={{ kind: 'project', ...item }} key={`project:${item.id}`} />
						))}
					</div>
				) : null}
			</div>
		)
	}

	return (
		<div
			aria-label='Launcher 结果'
			className='flex flex-col gap-0.5 px-2 pb-0.5'
			data-testid='launcher-results'
			role='list'
		>
			<div data-testid='launcher-search-results'>
				{derived.flatItems.map((item) => (
					<LauncherResultRow item={item} key={getLauncherResultKey(item)} />
				))}
			</div>
		</div>
	)
}

function LauncherResultRow({ item }: { item: LauncherResultItem }) {
	const { actions, refs, resultCollection } = useLauncher()
	const itemKey = getLauncherResultKey(item)
	const unregisterRef = useRef<(() => void) | null>(null)
	const setRowRef = useCallback(
		(element: HTMLButtonElement | null) => {
			unregisterRef.current?.()
			unregisterRef.current = element ? refs.resultFocusBridge.registerItem(itemKey, element) : null
		},
		[itemKey, refs.resultFocusBridge],
	)
	useEffect(() => () => unregisterRef.current?.(), [])

	const sharedProps = {
		isActive: resultCollection.focusedKey === itemKey,
		onFocus: () => actions.focusResult(itemKey),
		onKeyDown: actions.handleKeyDown,
		rowRef: setRowRef,
	}

	if (item.kind === 'task') {
		return (
			<TaskResultRowAdapter
				item={item}
				onOpen={(task) => void actions.openResult({ kind: 'task', ...task })}
				{...sharedProps}
			/>
		)
	}

	return (
		<ProjectResultRowAdapter
			item={item}
			onOpen={(project) => void actions.openResult({ kind: 'project', ...project })}
			{...sharedProps}
		/>
	)
}
