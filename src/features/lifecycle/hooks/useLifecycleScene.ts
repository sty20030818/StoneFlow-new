import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import {
	openSection,
	resolveBreadcrumb,
	resolveShellRouteScope,
	useCurrentShellRoute,
} from '@/app/navigation'
import {
	LIFECYCLE_BULK_ACTION_IDS,
	createLifecycleBulkSelectionSnapshot,
	shouldClearBulkSelection,
	showBulkActionResultToast,
	useBulkActionContext,
	type BulkActionId,
} from '@/features/bulk-action'
import { useEntityDetailController } from '@/features/entity-detail'
import { useEntitySelection, useRegisterCommandSelection } from '@/features/selection'
import type { LifecycleEntry, LifecycleMode } from '@/shared/types'
import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'

import {
	useDeleteLifecycleEntryMutation,
	usePermanentlyDeleteLifecycleEntryMutation,
	useRestoreLifecycleEntryMutation,
} from './lifecycle.mutations'
import { useLifecycleEntriesQuery } from './lifecycle.queries'
import { buildLifecycleCommandSelection } from '../model/buildLifecycleCommandSelection'
import { buildLifecycleSections, type LifecycleEntityFilter } from '../model/buildLifecycleSections'
import type { LifecycleBoardProps } from '../components/LifecycleBoard'

const EMPTY_LIFECYCLE_ENTRIES: LifecycleEntry[] = []

/**
 * 归档/回收站页唯一 wiring：列表 / 筛选 / 选择 / bulk / 打开详情。
 * 写路径经本域 mutations → api 委托 task/project/space public。
 */
export function useLifecycleScene(mode: LifecycleMode) {
	const navigate = useNavigate({ from: '/' })
	const openTaskDetail = useEntityDetailController().openTaskDetail
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const spaceId = shellRoute.spaceId
	const entriesQuery = useLifecycleEntriesQuery(mode, scope)
	const restoreEntry = useRestoreLifecycleEntryMutation()
	const deleteEntry = useDeleteLifecycleEntryMutation()
	const permanentlyDeleteEntry = usePermanentlyDeleteLifecycleEntryMutation()
	const { runBulkAction } = useBulkActionContext()
	const [entityFilter, setEntityFilter] = useState<LifecycleEntityFilter>('all')
	const [pendingEntryId, setPendingEntryId] = useState<string | null>(null)

	const breadcrumbItems = useMemo(() => resolveBreadcrumb({ route: shellRoute }), [shellRoute])

	const sliceStatus = entriesQuery.isError
		? 'error'
		: entriesQuery.isLoading || entriesQuery.isPending
			? 'loading'
			: 'ready'
	const sliceItems = entriesQuery.data ?? EMPTY_LIFECYCLE_ENTRIES

	const {
		selectedIdSet: selectedEntryIdSet,
		selectionSnapshot,
		focusedId: focusedEntryId,
		toggleSelection: toggleEntrySelection,
		clearSelection: clearEntrySelection,
		setFocusedId: setFocusedEntryId,
		moveFocus,
		selectIds: selectEntryIds,
	} = useEntitySelection(sliceItems.map((entry) => entry.id))

	const commandSelection = useMemo(
		() =>
			buildLifecycleCommandSelection({
				selectedIds: selectionSnapshot.ids,
				entries: sliceItems,
				mode,
				clearSelection: clearEntrySelection,
			}),
		[clearEntrySelection, mode, selectionSnapshot.ids, sliceItems],
	)
	const readCommandSelection = useCallback(() => commandSelection, [commandSelection])
	useRegisterCommandSelection(readCommandSelection)
	const showSpacePill = scope.type === 'all'
	const scopeItems = showSpacePill
		? sliceItems
		: sliceItems.filter((entry) => entry.entityType !== 'space')

	const toolbarPills = [
		{
			key: 'all' as const,
			label: `${mode === 'archive' ? '所有归档' : '所有删除'} ${scopeItems.length}`,
		},
		...(showSpacePill
			? [
					{
						key: 'space' as const,
						label: `空间 ${sliceItems.filter((entry) => entry.entityType === 'space').length}`,
					},
				]
			: []),
		{
			key: 'project' as const,
			label: `项目 ${scopeItems.filter((entry) => entry.entityType === 'project').length}`,
		},
		{
			key: 'task' as const,
			label: `任务 ${scopeItems.filter((entry) => entry.entityType === 'task').length}`,
		},
	].map((pill) => ({
		label: pill.label,
		active: entityFilter === pill.key,
		onPress: () => setEntityFilter(pill.key),
	}))

	function handleOpenDetail(entry: LifecycleEntry) {
		if (entry.entityType === 'task') {
			openTaskDetail(entry.id)
			return
		}

		if (entry.entityType === 'space' && entry.spaceId) {
			void navigate({
				to: openSection(
					{ type: 'space', spaceId: entry.spaceId },
					'standalone',
					entry.spaceId,
				) as never,
			})
		}
	}

	const runLifecycleBulkAction = useCallback(
		async (actionId: BulkActionId, entries: LifecycleEntry[]) => {
			const result = await runBulkAction(
				actionId,
				createLifecycleBulkSelectionSnapshot(entries, 'context-menu'),
			)
			if (shouldClearBulkSelection(result)) {
				clearEntrySelection()
			}
			showBulkActionResultToast(result, { successVerb: '处理', entityLabel: '条目' })
		},
		[clearEntrySelection, runBulkAction],
	)

	async function runEntryMutation(entry: LifecycleEntry, runner: () => Promise<unknown>) {
		setPendingEntryId(entry.id)
		try {
			await runner()
		} catch (error) {
			toast.error(normalizeTauriError(error, '操作失败，请稍后重试'))
		} finally {
			setPendingEntryId(null)
		}
	}

	const sections = useMemo(
		() => buildLifecycleSections(sliceItems, entityFilter, mode, scope),
		[entityFilter, mode, sliceItems, scope],
	)

	const lifecycleBoardProps: LifecycleBoardProps = {
		mode,
		sections,
		status: sliceStatus,
		pendingEntryId,
		selectedEntryIdSet,
		focusedEntryId,
		emptyActionLabel: '返回独立事项',
		emptyDescription:
			mode === 'archive'
				? '归档后的任务和项目会放在这里。点「返回独立事项」先回去继续处理手头内容就好。'
				: '删除后的任务和项目会先来到这里。点「返回独立事项」先回去继续处理内容就好。',
		emptyTitle: mode === 'archive' ? '当前没有已归档内容' : '当前没有已删除内容',
		onEmptyAction: () => {
			void navigate({ to: openSection(scope, 'standalone', spaceId) as never })
		},
		onOpenDetail: mode === 'archive' ? handleOpenDetail : undefined,
		onRestore: (entry: LifecycleEntry) => {
			void runEntryMutation(entry, () => restoreEntry.mutateAsync(entry))
		},
		onRestoreEntries: (entries: LifecycleEntry[]) => {
			void runLifecycleBulkAction(LIFECYCLE_BULK_ACTION_IDS.restoreSelected, entries)
		},
		onMoveToTrash: (entry: LifecycleEntry) => {
			void runEntryMutation(entry, () => deleteEntry.mutateAsync(entry))
		},
		onMoveToTrashEntries: (entries: LifecycleEntry[]) => {
			void runLifecycleBulkAction(LIFECYCLE_BULK_ACTION_IDS.deleteSelected, entries)
		},
		onPermanentlyDelete: (entry: LifecycleEntry) => {
			void runEntryMutation(entry, () => permanentlyDeleteEntry.mutateAsync(entry))
		},
		onPermanentlyDeleteEntries: (entries: LifecycleEntry[]) => {
			void runLifecycleBulkAction(LIFECYCLE_BULK_ACTION_IDS.deletePermanentlySelected, entries)
		},
		onSelectAllEntries: selectEntryIds,
		onToggleEntrySelection: toggleEntrySelection,
		onSetFocusedEntry: setFocusedEntryId,
		onMoveEntryFocus: moveFocus,
		onClearEntrySelection: clearEntrySelection,
	}

	return {
		mode,
		lifecycleBoardProps,
		breadcrumbItems,
		toolbarPills,
	}
}
