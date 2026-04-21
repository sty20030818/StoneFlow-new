import { startTransition, useEffect, useEffectEvent, useState } from 'react'

import {
	selectProjectDataVersion,
	selectTaskDataVersion,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import { listTrashEntries } from '@/features/trash/api/listTrashEntries'
import { restoreProjectFromTrash } from '@/features/trash/api/restoreProjectFromTrash'
import { restoreTaskFromTrash } from '@/features/trash/api/restoreTaskFromTrash'
import type { TrashEntry } from '@/features/trash/model/types'

type UseTrashEntriesResult = {
	entries: TrashEntry[]
	isLoading: boolean
	loadError: string | null
	feedback: string | null
	pendingEntryId: string | null
	refresh: () => Promise<void>
	restoreEntry: (entry: TrashEntry) => Promise<void>
}

/**
 * 统一管理 Trash 页的真实列表、恢复动作和全局数据版本刷新。
 */
export function useTrashEntries(spaceSlug: string): UseTrashEntriesResult {
	const taskDataVersion = useShellLayoutStore(selectTaskDataVersion)
	const projectDataVersion = useShellLayoutStore(selectProjectDataVersion)
	const bumpTaskDataVersion = useShellLayoutStore((state) => state.bumpTaskDataVersion)
	const bumpProjectDataVersion = useShellLayoutStore((state) => state.bumpProjectDataVersion)
	const [entries, setEntries] = useState<TrashEntry[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [feedback, setFeedback] = useState<string | null>(null)
	const [pendingEntryId, setPendingEntryId] = useState<string | null>(null)

	const refresh = useEffectEvent(async () => {
		setIsLoading(true)
		setLoadError(null)

		try {
			const payload = await listTrashEntries({ spaceSlug })

			startTransition(() => {
				setEntries(payload.entries)
			})
		} catch (error) {
			setLoadError(toErrorMessage(error))
		} finally {
			setIsLoading(false)
		}
	})

	useEffect(() => {
		void refresh()
	}, [spaceSlug, taskDataVersion, projectDataVersion])

	const restoreEntry = useEffectEvent(async (entry: TrashEntry) => {
		setPendingEntryId(entry.id)
		setLoadError(null)
		setFeedback(null)

		try {
			const restored =
				entry.entityType === 'task'
					? await restoreTaskFromTrash({ spaceSlug, trashEntryId: entry.id })
					: await restoreProjectFromTrash({ spaceSlug, trashEntryId: entry.id })

			if (restored.entityType === 'task') {
				bumpTaskDataVersion()
			} else {
				bumpProjectDataVersion()
			}

			await refresh()

			startTransition(() => {
				setFeedback(`已恢复“${entry.title}”`)
			})
		} catch (error) {
			setLoadError(toErrorMessage(error))
		} finally {
			setPendingEntryId(null)
		}
	})

	return {
		entries,
		isLoading,
		loadError,
		feedback,
		pendingEntryId,
		refresh,
		restoreEntry,
	}
}

function toErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : 'Trash 请求失败，请稍后重试。'
}
