import { startTransition, useEffect, useEffectEvent, useRef, useState } from 'react'

import {
	selectTaskDataVersion,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import { getFocusViewTasks } from '@/features/focus/api/getFocusViewTasks'
import { listFocusViews } from '@/features/focus/api/listFocusViews'
import { updateTaskPinState } from '@/features/focus/api/updateTaskPinState'
import type { UpdatedProjectTaskStatusPayload } from '@/features/project/api/updateProjectTaskStatus'
import { updateProjectTaskStatus } from '@/features/project/api/updateProjectTaskStatus'
import type {
	FocusRecentTimeWindow,
	FocusTaskRecord,
	FocusViewKey,
	FocusViewRecord,
	FocusViewSnapshot,
	FocusWorkspaceSummary,
} from '@/features/focus/model/types'

type UseFocusWorkspaceResult = {
	views: FocusViewRecord[]
	activeViewKey: FocusViewKey
	recentTimeWindow: FocusRecentTimeWindow
	summaries: FocusWorkspaceSummary[]
	tasks: FocusTaskRecord[]
	isLoading: boolean
	loadError: string | null
	feedback: string | null
	pendingTaskId: string | null
	setActiveViewKey: (viewKey: FocusViewKey) => void
	setRecentTimeWindow: (window: FocusRecentTimeWindow) => void
	refresh: () => Promise<void>
	toggleTaskPin: (task: FocusTaskRecord) => Promise<void>
	toggleTaskStatus: (task: FocusTaskRecord) => Promise<void>
}

const DEFAULT_ACTIVE_VIEW_KEY: FocusViewKey = 'focus'
const DEFAULT_RECENT_TIME_WINDOW: FocusRecentTimeWindow = 'all'
const VIEW_SUMMARY_META: Record<
	FocusViewKey,
	{
		label: string
		description: string
	}
> = {
	focus: {
		label: 'Focus',
		description: '手动置顶的执行任务',
	},
	upcoming: {
		label: 'Upcoming',
		description: '按截止时间排序的任务',
	},
	recent: {
		label: '最近添加',
		description: '按创建时间回看新增任务',
	},
	high_priority: {
		label: '高优先级',
		description: '聚合 high 与 urgent',
	},
}

/**
 * 为后续 Focus 页提供真实视图列表、单视图查询与 pin 动作骨架。
 */
export function useFocusWorkspace(spaceId: string): UseFocusWorkspaceResult {
	const taskDataVersion = useShellLayoutStore(selectTaskDataVersion)
	const bumpTaskDataVersion = useShellLayoutStore((state) => state.bumpTaskDataVersion)
	const skipNextTaskDataVersionRefreshRef = useRef(false)
	const lastTaskDataVersionRef = useRef(taskDataVersion)
	const [views, setViews] = useState<FocusViewRecord[]>([])
	const [activeViewKey, setActiveViewKey] = useState<FocusViewKey>(DEFAULT_ACTIVE_VIEW_KEY)
	const [recentTimeWindow, setRecentTimeWindow] = useState<FocusRecentTimeWindow>(
		DEFAULT_RECENT_TIME_WINDOW,
	)
	const [snapshots, setSnapshots] = useState<Partial<Record<FocusViewKey, FocusViewSnapshot>>>({})
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [feedback, setFeedback] = useState<string | null>(null)
	const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)

	const refresh = useEffectEvent(async (preserveFeedback = false) => {
		setIsLoading(true)
		setLoadError(null)

		try {
			const nextViews = await listFocusViews({ spaceSlug: spaceId })
			const nextActiveViewKey = resolveActiveViewKey(nextViews, activeViewKey)
			const nextSnapshots = await loadSnapshots(spaceId, nextViews)

			startTransition(() => {
				setViews(nextViews)
				setActiveViewKey(nextActiveViewKey)
				setSnapshots(nextSnapshots)
				if (!preserveFeedback) {
					setFeedback(null)
				}
			})
		} catch (error) {
			setSnapshots({})
			setLoadError(toErrorMessage(error))
		} finally {
			setIsLoading(false)
		}
	})

	useEffect(() => {
		void refresh()
	}, [spaceId])

	useEffect(() => {
		if (skipNextTaskDataVersionRefreshRef.current) {
			skipNextTaskDataVersionRefreshRef.current = false
			lastTaskDataVersionRef.current = taskDataVersion
			return
		}

		if (lastTaskDataVersionRef.current === taskDataVersion) {
			return
		}

		lastTaskDataVersionRef.current = taskDataVersion
		void refresh()
	}, [taskDataVersion])

	const toggleTaskPin = useEffectEvent(async (task: FocusTaskRecord) => {
		const nextPinned = !task.pinned
		setPendingTaskId(task.id)
		setLoadError(null)

		try {
			const payload = await updateTaskPinState({
				spaceSlug: spaceId,
				taskId: task.id,
				pinned: nextPinned,
			})

			startTransition(() => {
				setFeedback(
					payload.pinned ? `已将“${task.title}”加入 Focus` : `已将“${task.title}”移出 Focus`,
				)
			})
			skipNextTaskDataVersionRefreshRef.current = true
			bumpTaskDataVersion()
			await refresh(true)
		} catch (error) {
			setLoadError(toErrorMessage(error))
		} finally {
			setPendingTaskId(null)
		}
	})

	const toggleTaskStatus = useEffectEvent(async (task: FocusTaskRecord) => {
		if (!task.projectId) {
			setLoadError('当前任务缺少 Project，无法切换执行状态。')
			return
		}

		const nextStatus = task.status === 'todo' ? 'done' : 'todo'
		setPendingTaskId(task.id)
		setLoadError(null)

		try {
			const payload = await updateProjectTaskStatus({
				spaceSlug: spaceId,
				projectId: task.projectId,
				taskId: task.id,
				status: nextStatus,
			})

			startTransition(() => {
				setFeedback(createTaskStatusFeedback(task.title, payload))
			})
			skipNextTaskDataVersionRefreshRef.current = true
			bumpTaskDataVersion()
			await refresh(true)
		} catch (error) {
			setLoadError(toErrorMessage(error))
		} finally {
			setPendingTaskId(null)
		}
	})

	const activeSnapshot = snapshots[activeViewKey]
	const tasks =
		activeViewKey === 'recent'
			? filterRecentTasks(activeSnapshot?.tasks ?? [], recentTimeWindow)
			: (activeSnapshot?.tasks ?? [])
	const summaries = views.map((view) => ({
		key: view.key,
		label: VIEW_SUMMARY_META[view.key].label,
		description: VIEW_SUMMARY_META[view.key].description,
		count: snapshots[view.key]?.tasks.length ?? 0,
	}))

	return {
		views,
		activeViewKey,
		recentTimeWindow,
		summaries,
		tasks,
		isLoading,
		loadError,
		feedback,
		pendingTaskId,
		setActiveViewKey,
		setRecentTimeWindow,
		refresh,
		toggleTaskPin,
		toggleTaskStatus,
	}
}

function resolveActiveViewKey(views: FocusViewRecord[], activeViewKey: FocusViewKey): FocusViewKey {
	if (views.some((view) => view.key === activeViewKey)) {
		return activeViewKey
	}

	return views[0]?.key ?? DEFAULT_ACTIVE_VIEW_KEY
}

async function loadSnapshots(spaceId: string, views: FocusViewRecord[]) {
	const results = await Promise.all(
		views.map(async (view) => {
			const snapshot = await getFocusViewTasks({
				spaceSlug: spaceId,
				viewKey: view.key,
			})

			return [view.key, snapshot] as const
		}),
	)

	return Object.fromEntries(results) as Partial<Record<FocusViewKey, FocusViewSnapshot>>
}

function filterRecentTasks(tasks: FocusTaskRecord[], recentTimeWindow: FocusRecentTimeWindow) {
	if (recentTimeWindow === 'all') {
		return tasks
	}

	const windowDays = recentTimeWindow === '7d' ? 7 : 30
	const windowStart = Date.now() - windowDays * 24 * 60 * 60 * 1000

	return tasks.filter((task) => new Date(task.createdAt).getTime() >= windowStart)
}

function createTaskStatusFeedback(title: string, payload: UpdatedProjectTaskStatusPayload) {
	return payload.status === 'done' ? `已完成“${title}”` : `已将“${title}”恢复为待执行`
}

function toErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : 'Focus 请求失败，请稍后重试。'
}
