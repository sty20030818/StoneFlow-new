import { useEffect, useEffectEvent, useState } from 'react'

import {
	selectProjectDataVersion,
	selectTaskDataVersion,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import type { ShellSectionKey } from '@/app/layouts/shell/types'
import { listInboxTasks } from '@/features/inbox/api/listInboxTasks'
import { listTrashEntries } from '@/features/trash/api/listTrashEntries'

export type ShellNavBadges = Partial<Record<ShellSectionKey, string>>

/**
 * 为 Shell 一级导航提供真实数量 badge，避免 Inbox / Trash 使用静态占位数字。
 */
export function useShellNavBadges(spaceId: string): ShellNavBadges {
	const taskDataVersion = useShellLayoutStore(selectTaskDataVersion)
	const projectDataVersion = useShellLayoutStore(selectProjectDataVersion)
	const [badges, setBadges] = useState<ShellNavBadges>({})

	const refresh = useEffectEvent(async () => {
		const [inboxResult, trashResult] = await Promise.allSettled([
			listInboxTasks({ spaceSlug: spaceId }),
			listTrashEntries({ spaceSlug: spaceId }),
		])

		setBadges({
			inbox:
				inboxResult.status === 'fulfilled'
					? formatBadgeCount(inboxResult.value.tasks.length)
					: undefined,
			trash:
				trashResult.status === 'fulfilled'
					? formatBadgeCount(trashResult.value.entries.length)
					: undefined,
		})
	})

	useEffect(() => {
		void refresh()
	}, [spaceId, taskDataVersion, projectDataVersion])

	return badges
}

function formatBadgeCount(count: number) {
	if (count <= 0) {
		return undefined
	}

	return count > 99 ? '99+' : String(count)
}
