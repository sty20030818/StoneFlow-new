import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { EntityScene } from '@/app/layouts/entity-scene'
import { buildCanonicalSectionPath, useShellRoute } from '@/app/routing'
import {
	BulkActionBar,
	LIFECYCLE_BULK_ACTION_IDS,
	createLifecycleBulkSelectionSnapshot,
	shouldClearBulkSelection,
	showBulkActionResultToast,
	useBulkActionContext,
	type BulkActionId,
} from '@/features/bulk-action'
import { useEntityDetailController } from '@/features/entity-detail'
import {
	selectArchiveEntries,
	selectTrashEntries,
	useLifecycleStore,
} from '@/features/lifecycle/model/useLifecycleStore'
import {
	buildLifecycleCommandSelection,
	useEntitySelection,
	useEntitySelectionEscape,
	useRegisterCommandSelection,
} from '@/features/selection/model'
import { isScopeMatch } from '@/shared/lib/scope'
import type { LifecycleEntry, LifecycleMode, Scope } from '@/shared/types'
import { Button } from '@/shared/ui/base/button'
import { BULK_ACTION_BUTTON_CLASS } from '@/shared/ui/patterns/bulk-action'
import { AppBreadcrumb } from '@/shared/ui/AppBreadcrumb'
import type { LucideIcon } from 'lucide-react'
import { resolveBreadcrumb } from '@/shared/ui/breadcrumbResolver'

type LifecycleListProps = {
	mode: LifecycleMode
	title: string
	icon: LucideIcon
}

type LifecycleFilter = 'all' | 'space' | 'project' | 'task'

const ALL_SCOPE = { type: 'all' } as const

export function LifecycleList({ mode, title }: LifecycleListProps) {
	const navigate = useNavigate()
	const openEntityDrawer = useEntityDetailController().openDrawer
	const shellRoute = useShellRoute()
	const scope = shellRoute.scope ?? ALL_SCOPE
	const spaceId = shellRoute.spaceId
	const archiveEntries = useLifecycleStore(selectArchiveEntries)
	const trashEntries = useLifecycleStore(selectTrashEntries)
	const pendingEntryId = useLifecycleStore((state) => state.pendingEntryId)
	const loadArchive = useLifecycleStore((state) => state.loadArchive)
	const loadTrash = useLifecycleStore((state) => state.loadTrash)
	const restoreEntry = useLifecycleStore((state) => state.restoreEntry)
	const deleteEntry = useLifecycleStore((state) => state.deleteEntry)
	const permanentlyDeleteEntry = useLifecycleStore((state) => state.permanentlyDeleteEntry)
	const refreshLoadedSlices = useLifecycleStore((state) => state.refreshLoadedSlices)
	const { runBulkAction } = useBulkActionContext()
	const [entityFilter, setEntityFilter] = useState<LifecycleFilter>('all')
	const breadcrumbItems = useMemo(() => resolveBreadcrumb({ route: shellRoute }), [shellRoute])

	const slice = mode === 'archive' ? archiveEntries : trashEntries
	const sliceStatus = isScopeMatch(slice.scope, scope) ? slice.status : 'loading'
	const sliceItems = sliceStatus === 'loading' ? [] : slice.items
	const {
		selectedIdSet: selectedEntryIdSet,
		selectionSnapshot,
		selectedCount,
		focusedId: focusedEntryId,
		toggleSelection: toggleEntrySelection,
		clearSelection: clearEntrySelection,
		setFocusedId: setFocusedEntryId,
		moveFocus,
		selectIds: selectEntryIds,
	} = useEntitySelection(sliceItems.map((entry) => entry.id))
	const selectedEntries = useMemo(
		() => sliceItems.filter((entry) => selectedEntryIdSet.has(entry.id)),
		[selectedEntryIdSet, sliceItems],
	)
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
	useRegisterCommandSelection(commandSelection)
	useEntitySelectionEscape({
		hasSelection: selectedCount > 0,
		clearSelection: clearEntrySelection,
	})
	const showSpacePill = scope.type === 'all'
	const scopeItems = showSpacePill
		? sliceItems
		: sliceItems.filter((entry) => entry.entityType !== 'space')
	const lifecyclePills = [
		{ key: 'all', label: `${mode === 'archive' ? '所有归档' : '所有删除'} ${scopeItems.length}` },
		...(showSpacePill
			? [
					{
						key: 'space' as const,
						label: `空间 ${sliceItems.filter((entry) => entry.entityType === 'space').length}`,
					},
				]
			: []),
		{
			key: 'project',
			label: `项目 ${scopeItems.filter((entry) => entry.entityType === 'project').length}`,
		},
		{
			key: 'task',
			label: `任务 ${scopeItems.filter((entry) => entry.entityType === 'task').length}`,
		},
	]

	useEffect(() => {
		if (mode === 'archive') {
			void loadArchive(scope)
			return
		}

		void loadTrash(scope)
	}, [loadArchive, loadTrash, mode, scope])

	function handleOpenDetail(entry: LifecycleEntry) {
		if (entry.entityType === 'task') {
			openEntityDrawer({ kind: 'task', id: entry.id })
			return
		}

		if (entry.entityType === 'project') {
			openEntityDrawer({ kind: 'project', id: entry.id })
			return
		}

		if (entry.spaceId) {
			void navigate(buildCanonicalSectionPath({ type: 'space', spaceId: entry.spaceId }, 'inbox'))
		}
	}

	const runLifecycleBulkAction = useCallback(
		async (
			actionId: BulkActionId,
			entries: LifecycleEntry[] = selectedEntries,
			source: 'bulk-bar' | 'context-menu' = 'bulk-bar',
		) => {
			const result = await runBulkAction(
				actionId,
				createLifecycleBulkSelectionSnapshot(entries, source),
			)
			if (shouldClearBulkSelection(result)) {
				clearEntrySelection()
			}
			showBulkActionResultToast(result, { successVerb: '处理', entityLabel: '条目' })
		},
		[clearEntrySelection, runBulkAction, selectedEntries],
	)

	const sections = useMemo(
		() => buildLifecycleSections(sliceItems, entityFilter, mode, scope),
		[entityFilter, mode, sliceItems, scope],
	)

	return (
		<>
			<EntityScene
				board={{
					boardKind: 'lifecycle',
					boardConfig: {
						emptyActionLabel: '返回收件箱',
						emptyDescription:
							mode === 'archive'
								? '归档后的内容会统一出现在这里。'
								: '删除后的内容会统一出现在这里，等待恢复或永久删除。',
						emptyTitle: `${title}为空`,
						mode,
					},
					boardData: {
						sections,
						status: sliceStatus,
						pendingEntryId,
						selectedEntryIdSet,
						focusedEntryId,
					},
					boardActions: {
						onEmptyAction: () => {
							void navigate(buildCanonicalSectionPath(scope, 'inbox', spaceId))
						},
						onOpenDetail: mode === 'archive' ? handleOpenDetail : undefined,
						onRestore: (entry: LifecycleEntry) => {
							void restoreEntry(entry)
						},
						onRestoreEntries: (entries: LifecycleEntry[]) => {
							void runLifecycleBulkAction(
								LIFECYCLE_BULK_ACTION_IDS.restoreSelected,
								entries,
								'context-menu',
							)
						},
						onMoveToTrash: (entry: LifecycleEntry) => {
							void deleteEntry(entry)
						},
						onMoveToTrashEntries: (entries: LifecycleEntry[]) => {
							void runLifecycleBulkAction(
								LIFECYCLE_BULK_ACTION_IDS.deleteSelected,
								entries,
								'context-menu',
							)
						},
						onPermanentlyDelete: (entry: LifecycleEntry) => {
							void permanentlyDeleteEntry(entry)
						},
						onPermanentlyDeleteEntries: (entries: LifecycleEntry[]) => {
							void runLifecycleBulkAction(
								LIFECYCLE_BULK_ACTION_IDS.deletePermanentlySelected,
								entries,
								'context-menu',
							)
						},
						onSelectAllEntries: selectEntryIds,
						onToggleEntrySelection: toggleEntrySelection,
						onSetFocusedEntry: setFocusedEntryId,
						onMoveEntryFocus: moveFocus,
						onClearEntrySelection: clearEntrySelection,
					},
				}}
				breadcrumb={<AppBreadcrumb items={breadcrumbItems} />}
				bulkBar={
					<BulkActionBar
						action={
							<LifecycleBulkBarActions
								mode={mode}
								onDeletePermanently={() => {
									void runLifecycleBulkAction(LIFECYCLE_BULK_ACTION_IDS.deletePermanentlySelected)
								}}
								onDelete={() => {
									void runLifecycleBulkAction(LIFECYCLE_BULK_ACTION_IDS.deleteSelected)
								}}
								onRestore={() => {
									void runLifecycleBulkAction(LIFECYCLE_BULK_ACTION_IDS.restoreSelected)
								}}
							/>
						}
						onClear={clearEntrySelection}
						selectedCount={selectedCount}
					/>
				}
				onRefresh={() => {
					void refreshLoadedSlices()
				}}
				sceneVariant={mode}
				toolbarPills={lifecyclePills.map((pill) => ({
					label: pill.label,
					active: entityFilter === pill.key,
					onClick: () => setEntityFilter(pill.key as LifecycleFilter),
				}))}
			/>
		</>
	)
}

function LifecycleBulkBarActions({
	mode,
	onDelete,
	onDeletePermanently,
	onRestore,
}: {
	mode: LifecycleMode
	onDelete: () => void
	onDeletePermanently: () => void
	onRestore: () => void
}) {
	return (
		<div className='flex items-center gap-1'>
			<Button
				className={BULK_ACTION_BUTTON_CLASS}
				onClick={onRestore}
				size='sm'
				type='button'
				variant='outline'
			>
				恢复
			</Button>
			{mode === 'archive' ? (
				<Button
					className={BULK_ACTION_BUTTON_CLASS}
					onClick={onDelete}
					size='sm'
					type='button'
					variant='outline'
				>
					删除
				</Button>
			) : (
				<Button
					className={BULK_ACTION_BUTTON_CLASS}
					onClick={onDeletePermanently}
					size='sm'
					type='button'
					variant='outline'
				>
					永久删除
				</Button>
			)}
		</div>
	)
}

function buildLifecycleSections(
	entries: LifecycleEntry[],
	filter: LifecycleFilter,
	mode: LifecycleMode,
	scope: Scope,
) {
	const showSpace = scope.type === 'all'
	const filteredEntries = showSpace
		? entries
		: entries.filter((entry) => entry.entityType !== 'space')

	if (filter === 'space') {
		if (!showSpace) return []
		return [
			{
				key: 'space',
				label: mode === 'archive' ? '已归档的空间' : '已删除的空间',
				items: entries.filter((entry) => entry.entityType === 'space'),
			},
		]
	}

	if (filter === 'project') {
		return [
			{
				key: 'project',
				label: mode === 'archive' ? '已归档的项目' : '已删除的项目',
				items: filteredEntries.filter((entry) => entry.entityType === 'project'),
			},
		]
	}

	if (filter === 'task') {
		return [
			{
				key: 'task',
				label: mode === 'archive' ? '已归档的任务' : '已删除的任务',
				items: filteredEntries.filter((entry) => entry.entityType === 'task'),
			},
		]
	}

	const sections = []
	if (showSpace) {
		sections.push({
			key: 'space',
			label: mode === 'archive' ? '已归档的空间' : '已删除的空间',
			items: entries.filter((entry) => entry.entityType === 'space'),
		})
	}
	sections.push({
		key: 'project',
		label: mode === 'archive' ? '已归档的项目' : '已删除的项目',
		items: filteredEntries.filter((entry) => entry.entityType === 'project'),
	})
	sections.push({
		key: 'task',
		label: mode === 'archive' ? '已归档的任务' : '已删除的任务',
		items: filteredEntries.filter((entry) => entry.entityType === 'task'),
	})
	return sections
}
