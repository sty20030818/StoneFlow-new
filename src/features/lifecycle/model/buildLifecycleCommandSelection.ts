import type { CommandSelectionContext } from '@/features/command'
import type { LifecycleEntry, LifecycleMode } from '@/shared/types'

type BuildLifecycleCommandSelectionInput = {
	selectedIds: string[]
	entries: LifecycleEntry[]
	mode: LifecycleMode
	clearSelection?: () => void
}

/** 将归档/回收站多选映射为命令菜单 selection 上下文。 */
export function buildLifecycleCommandSelection({
	selectedIds,
	entries,
	mode,
	clearSelection,
}: BuildLifecycleCommandSelectionInput): CommandSelectionContext {
	const entryById = new Map(entries.map((entry) => [entry.id, entry]))
	const entities = selectedIds.flatMap((entryId) => {
		const entry = entryById.get(entryId)
		if (!entry) {
			return []
		}

		return [
			{
				id: entry.id,
				type: 'lifecycle' as const,
				title: entry.title,
				subtitle: getLifecycleEntrySubtitle(entry),
				lifecycleMode: mode,
				lifecycleEntityType: entry.entityType,
			},
		]
	})
	const ids = entities.map((entity) => entity.id)
	const count = ids.length

	return {
		type: count > 0 ? 'lifecycle' : undefined,
		ids,
		entities,
		primaryEntity: entities[0],
		clearSelection,
		source: count > 0 ? 'lifecycle-list' : 'none',
		hasSelection: count > 0,
		isSingleSelection: count === 1,
		isMultiSelection: count > 1,
	}
}

function getLifecycleEntrySubtitle(entry: LifecycleEntry) {
	if (entry.entityType === 'space') {
		return '空间'
	}

	if (entry.entityType === 'project') {
		return entry.spaceName ? `项目 · ${entry.spaceName}` : '项目'
	}

	return entry.projectName ?? entry.spaceName ?? '任务'
}
