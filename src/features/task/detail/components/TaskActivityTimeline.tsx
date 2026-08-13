import { useCallback, useEffect, useMemo, useState } from 'react'

import { useEntityActivitiesQuery } from '@/features/activity'
import type { ActivityTimelineEntry } from '@/features/activity'
import { useProjectOptions } from '@/features/project'
import { useSpaces } from '@/features/space'
import { useEventSubscription, type AppEvent } from '@/shared/events'
import { Button } from '@/shared/components/base/button'
import { DetailSection } from '@/shared/components/detail'
import { StatusNotice } from '@/shared/components/StatusNotice'

import { buildTaskActivityDisplayItems } from './taskActivityTimelineModel'

type TaskActivityTimelineProps = {
	taskId: string
	spaceId: string
}

const DEFAULT_VISIBLE_COUNT = 6
const INITIAL_ACTIVITY_FETCH_LIMIT = 10
const EXPANDED_ACTIVITY_FETCH_LIMIT = 65_535
const EMPTY_ACTIVITY_ENTRIES: ActivityTimelineEntry[] = []

/**
 * Task Page 专用 Activity 列表。
 * V1 只做轻量列表和基础字段变化展开，不引入复杂筛选、分组或协作回复。
 */
export function TaskActivityTimeline({ spaceId, taskId }: TaskActivityTimelineProps) {
	const [showAll, setShowAll] = useState(false)
	const [requestedLimit, setRequestedLimit] = useState(INITIAL_ACTIVITY_FETCH_LIMIT)
	const queryInput = useMemo(
		() => ({
			entityType: 'task' as const,
			entityId: taskId,
			limit: requestedLimit,
		}),
		[requestedLimit, taskId],
	)
	const timeline = useEntityActivitiesQuery(queryInput)
	const projects = useProjectOptions({ type: 'space', spaceId })
	const { spaces } = useSpaces()
	const entries = timeline.data ?? EMPTY_ACTIVITY_ENTRIES
	const loadState = timeline.isError
		? 'error'
		: timeline.isLoading || timeline.isPending
			? 'loading'
			: 'ready'
	const errorMessage =
		timeline.error instanceof Error ? timeline.error.message : '读取 Activity 失败'

	useEffect(() => {
		setShowAll(false)
		setRequestedLimit(INITIAL_ACTIVITY_FETCH_LIMIT)
	}, [taskId])

	const reloadTimeline = useCallback(() => {
		void timeline.refetch()
	}, [timeline])

	const refetchCurrentTaskTimeline = useCallback(
		(event: AppEvent) => {
			if (
				(event.type === 'task:created' && event.payload.taskId === taskId) ||
				(event.type === 'task:updated' && event.payload.taskId === taskId) ||
				(event.type === 'task:deleted' && event.payload.taskId === taskId) ||
				(event.type === 'lifecycle:changed' &&
					event.payload.entityType === 'task' &&
					event.payload.entityId === taskId)
			) {
				reloadTimeline()
			}
		},
		[reloadTimeline, taskId],
	)

	useEventSubscription('task:created', refetchCurrentTaskTimeline)
	useEventSubscription('task:updated', refetchCurrentTaskTimeline)
	useEventSubscription('task:deleted', refetchCurrentTaskTimeline)
	useEventSubscription('lifecycle:changed', refetchCurrentTaskTimeline)

	useEffect(() => {
		if (!showAll && entries.length > DEFAULT_VISIBLE_COUNT) {
			return
		}

		if (showAll && requestedLimit < EXPANDED_ACTIVITY_FETCH_LIMIT) {
			setRequestedLimit(EXPANDED_ACTIVITY_FETCH_LIMIT)
		}
	}, [entries.length, requestedLimit, showAll])

	const displayItems = useMemo(() => {
		if (loadState !== 'ready') {
			return []
		}

		return buildTaskActivityDisplayItems({
			entries,
			projects,
			spaces,
			limit: entries.length,
		})
	}, [entries, loadState, projects, spaces])

	const visibleItems = useMemo(() => {
		if (showAll) {
			return displayItems
		}

		return displayItems.slice(0, DEFAULT_VISIBLE_COUNT)
	}, [displayItems, showAll])

	const hasMoreItems = displayItems.length > DEFAULT_VISIBLE_COUNT

	return (
		<DetailSection title='操作记录'>
			{loadState === 'loading' ? (
				<StatusNotice description='正在读取任务 Activity。' title='读取中' variant='neutral' />
			) : null}

			{loadState === 'error' ? (
				<StatusNotice description={errorMessage} title='Activity 读取失败' variant='danger' />
			) : null}

			{loadState === 'ready' && displayItems.length === 0 ? (
				<StatusNotice
					description='当前任务还没有任何 Activity 记录。'
					title='暂无 Activity'
					variant='neutral'
				/>
			) : null}

			{loadState === 'ready' && displayItems.length > 0 ? (
				<div className='flex flex-col'>
					<div className='flex flex-col'>
						{visibleItems.map((item) => (
							<article className='flex items-start gap-3 py-2' key={item.id}>
								<span className='mt-1 flex size-4 shrink-0 items-center justify-center text-sf-icon-secondary'>
									{item.icon}
								</span>
								<div className='min-w-0 flex-1 text-sm leading-6 text-legacy-foreground'>
									{item.text}
								</div>
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
