/**
 * Footer 右侧更新事务 · 容器。
 *
 * 订阅 store → 派生 view → 交给 UpdateFooterChip。
 * idle/checking 不渲染（只留版本号）。
 */

import { deriveUpdateFooterView } from '@/features/update/model/deriveUpdateFooterView'
import { useUpdateStore } from '@/features/update/model/useUpdateStore'
import { UpdateFooterChip } from '@/features/update/ui/UpdateFooterChip'

export function UpdateStatusFooterItem() {
	const phase = useUpdateStore((s) => s.phase)
	const progress = useUpdateStore((s) => s.progress)
	const updateInfo = useUpdateStore((s) => s.updateInfo)
	const errorMessage = useUpdateStore((s) => s.errorMessage)
	const openDialog = useUpdateStore((s) => s.openDialog)

	const view = deriveUpdateFooterView({
		phase,
		version: updateInfo?.version ?? null,
		downloaded: progress?.downloaded ?? 0,
		total: progress?.total ?? null,
		errorMessage,
	})

	if (!view) return null

	return <UpdateFooterChip view={view} onOpen={openDialog} />
}
