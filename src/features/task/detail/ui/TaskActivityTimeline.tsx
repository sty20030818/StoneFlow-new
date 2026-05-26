import { useEffect, useMemo, useState } from 'react'

import {
	getEntityActivities,
	type ActivityTimelineEntry,
} from '@/features/activity/api/getEntityActivities'
import { selectProjectOptions, useProjectStore } from '@/features/project/model/useProjectStore'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import { useEventSubscription, type AppEvent } from '@/shared/events'
import { Button } from '@/shared/ui/base/button'
import { DetailSection } from '@/shared/ui/detail'
import { StatusNotice } from '@/shared/ui/StatusNotice'

import { buildTaskActivityDisplayItems } from './taskActivityTimelineModel'

type LoadState =
	| { kind: 'loading' }
	| { kind: 'ready'; entries: ActivityTimelineEntry[] }
	| { kind: 'error'; message: string }

type TaskActivityTimelineProps = {
	taskId: string
}

const DEFAULT_VISIBLE_COUNT = 6
const INITIAL_ACTIVITY_FETCH_LIMIT = 10
const EXPANDED_ACTIVITY_FETCH_LIMIT = 65_535

/**
 * Task Page 专用 Activity 列表。
 * V1 只做轻量列表和基础字段变化展开，不引入复杂筛选、分组或协作回复。
 */
export function TaskActivityTimeline({ taskId }: TaskActivityTimelineProps) {
	const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' })
	const [showAll, setShowAll] = useState(false)
	const [requestedLimit, setRequestedLimit] = useState(INITIAL_ACTIVITY_FETCH_LIMIT)
	const [reloadVersion, setReloadVersion] = useState(0)
	const projects = useProjectStore(selectProjectOptions)
	const spaces = useSpaceStore(selectSpaces)

	useEffect(() => {
		setShowAll(false)
	}, [taskId])

	useEffect(() => {
		setRequestedLimit(INITIAL_ACTIVITY_FETCH_LIMIT)
		setLoadState({ kind: 'loading' })
	}, [taskId])

	useEffect(() => {
		let cancelled = false
		void loadTimeline(taskId, requestedLimit, setLoadState, () => cancelled)

		return () => {
			cancelled = true
		}
	}, [reloadVersion, requestedLimit, taskId])

	useEventSubscription('task:created', (event: AppEvent) => {
		if (event.type === 'task:created' && event.payload.taskId === taskId) {
			setReloadVersion((current) => current + 1)
		}
	})

	useEventSubscription('task:updated', (event: AppEvent) => {
		if (event.type === 'task:updated' && event.payload.taskId === taskId) {
			setReloadVersion((current) => current + 1)
		}
	})

	useEventSubscription('task:deleted', (event: AppEvent) => {
		if (event.type === 'task:deleted' && event.payload.taskId === taskId) {
			setReloadVersion((current) => current + 1)
		}
	})

	useEventSubscription('lifecycle:changed', (event: AppEvent) => {
		if (
			event.type === 'lifecycle:changed' &&
			event.payload.entityType === 'task' &&
			event.payload.entityId === taskId
		) {
			setReloadVersion((current) => current + 1)
		}
	})

	const displayItems = useMemo(() => {
		if (loadState.kind !== 'ready') {
			return []
		}

		return buildTaskActivityDisplayItems({
			entries: loadState.entries,
			projects,
			spaces,
			limit: loadState.entries.length,
		})
	}, [loadState, projects, spaces])

	const visibleItems = useMemo(() => {
		if (showAll) {
			return displayItems
		}

		return displayItems.slice(0, DEFAULT_VISIBLE_COUNT)
	}, [displayItems, showAll])

	const hasMoreItems = displayItems.length > DEFAULT_VISIBLE_COUNT

	return (
		<DetailSection title='操作记录'>
			{loadState.kind === 'loading' ? (
				<StatusNotice description='正在读取任务 Activity。' title='读取中' variant='neutral' />
			) : null}

			{loadState.kind === 'error' ? (
				<StatusNotice description={loadState.message} title='Activity 读取失败' variant='danger' />
			) : null}

			{loadState.kind === 'ready' && displayItems.length === 0 ? (
				<StatusNotice
					description='当前任务还没有任何 Activity 记录。'
					title='暂无 Activity'
					variant='neutral'
				/>
			) : null}

			{loadState.kind === 'ready' && displayItems.length > 0 ? (
				<div className='flex flex-col'>
					<div className='flex flex-col'>
						{visibleItems.map((item) => (
							<article className='flex items-start gap-3 py-2' key={item.id}>
								<span className='mt-1 flex size-4 shrink-0 items-center justify-center text-sf-icon-secondary'>
									{item.icon}
								</span>
								<div className='min-w-0 flex-1 text-sm leading-6 text-foreground'>{item.text}</div>
								<div className='shrink-0 pt-0.5 text-[12px] leading-5 text-sf-text-tertiary'>
									{item.relativeTime}
								</div>
							</article>
						))}
					</div>
					{hasMoreItems ? (
						<Button
							className='self-start px-3 text-[12px]'
							size='sm'
							variant='outline'
							onClick={() => {
								if (!showAll) {
									setShowAll(true)
									if (requestedLimit < EXPANDED_ACTIVITY_FETCH_LIMIT) {
										setRequestedLimit(EXPANDED_ACTIVITY_FETCH_LIMIT)
									}
									return
								}

								setShowAll(false)
							}}
						>
							{showAll ? '收起' : '查看更多'}
						</Button>
					) : null}
				</div>
			) : null}
		</DetailSection>
	)
}

async function loadTimeline(
	taskId: string,
	limit: number,
	setLoadState: (state: LoadState) => void,
	isCancelled?: () => boolean,
) {
	try {
		const entries = await getEntityActivities({
			entityType: 'task',
			entityId: taskId,
			limit,
		})

		if (!isCancelled?.()) {
			setLoadState({ kind: 'ready', entries })
		}
	} catch (error) {
		if (!isCancelled?.()) {
			setLoadState({
				kind: 'error',
				message: error instanceof Error ? error.message : '读取 Activity 失败',
			})
		}
	}
}
