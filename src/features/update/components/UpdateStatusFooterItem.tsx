/**
 * Footer 右侧更新事务 · 容器。
 *
 * 订阅 store → 派生 view → 交给 UpdateFooterChip。
 * idle/checking 不渲染（只留版本号）。
 */

import { deriveUpdateFooterView } from '../model/deriveUpdateFooterView'
import { selectUpdateSnapshot, useUpdateStore } from '../model/useUpdateStore'
import { UpdateFooterChip } from './UpdateFooterChip'

export function UpdateStatusFooterItem() {
	const snapshot = useUpdateStore(selectUpdateSnapshot)
	const openDialog = useUpdateStore((s) => s.openDialog)

	const view = deriveUpdateFooterView({
		phase: snapshot.phase,
		version: snapshot.update?.version ?? null,
		downloaded: snapshot.progress?.downloaded ?? 0,
		total: snapshot.progress?.total ?? null,
		errorMessage: snapshot.errorMessage,
	})

	if (!view) return null

	return <UpdateFooterChip view={view} onOpen={openDialog} />
}
