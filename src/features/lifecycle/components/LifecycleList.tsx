import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { EntityScene } from '@/features/entity-scene'
import { useCurrentShellRoute } from '@/app/navigation/ShellRouteContext'
import { openSection } from '@/app/navigation/intents'
import { resolveShellRouteScope } from '@/app/navigation/scope'
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
	useDeleteLifecycleEntryMutation,
	useLifecycleEntriesQuery,
	usePermanentlyDeleteLifecycleEntryMutation,
	useRestoreLifecycleEntryMutation,
} from '@/features/lifecycle/hooks'
import {
	buildLifecycleCommandSelection,
	useEntitySelection,
	useEntitySelectionEscape,
	useRegisterCommandSelection,
} from '@/features/selection'
import type { LifecycleEntry, LifecycleMode, Scope } from '@/shared/types'
import { Button } from '@/shared/components/base/button'
import { BULK_ACTION_BUTTON_CLASS } from '@/shared/components/patterns/bulk-action'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import type { LucideIcon } from 'lucide-react'
import { resolveBreadcrumb } from '@/app/navigation/breadcrumbResolver'

type LifecycleListProps = {
	mode: LifecycleMode
	title: string
	icon: LucideIcon
}

type LifecycleFilter = 'all' | 'space' | 'project' | 'task'

const EMPTY_LIFECYCLE_ENTRIES: LifecycleEntry[] = []

export function LifecycleList({ mode }: LifecycleListProps) {
	const navigate = useNavigate({ from: '/' })
	const openEntityDrawer = useEntityDetailController().openDrawer
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const spaceId = shellRoute.spaceId
	const entriesQuery = useLifecycleEntriesQuery(mode, scope)
	const restoreEntry = useRestoreLifecycleEntryMutation()
	const deleteEntry = useDeleteLifecycleEntryMutation()
	const permanentlyDeleteEntry = usePermanentlyDeleteLifecycleEntryMutation()
	const { runBulkAction } = useBulkActionContext()
	const [entityFilter, setEntityFilter] = useState<LifecycleFilter>('all')
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
			void navigate({
				to: openSection({ type: 'space', spaceId: entry.spaceId }, 'inbox', entry.spaceId) as never,
			})
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

	async function runEntryMutation(entry: LifecycleEntry, runner: () => Promise<unknown>) {
		setPendingEntryId(entry.id)
		try {
			await runner()
		} finally {
			setPendingEntryId(null)
		}
	}

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
								? '归档后的任务和项目会放在这里。点「返回收件箱」先回去继续处理手头内容就好。'
								: '删除后的任务和项目会先来到这里。点「返回收件箱」先回去继续处理内容就好。',
						emptyTitle: mode === 'archive' ? '当前没有已归档内容' : '当前没有已删除内容',
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
							void navigate({ to: openSection(scope, 'inbox', spaceId) as never })
						},
						onOpenDetail: mode === 'archive' ? handleOpenDetail : undefined,
						onRestore: (entry: LifecycleEntry) => {
							void runEntryMutation(entry, () => restoreEntry.mutateAsync(entry))
						},
						onRestoreEntries: (entries: LifecycleEntry[]) => {
							void runLifecycleBulkAction(
								LIFECYCLE_BULK_ACTION_IDS.restoreSelected,
								entries,
								'context-menu',
							)
						},
						onMoveToTrash: (entry: LifecycleEntry) => {
							void runEntryMutation(entry, () => deleteEntry.mutateAsync(entry))
						},
						onMoveToTrashEntries: (entries: LifecycleEntry[]) => {
							void runLifecycleBulkAction(
								LIFECYCLE_BULK_ACTION_IDS.deleteSelected,
								entries,
								'context-menu',
							)
						},
						onPermanentlyDelete: (entry: LifecycleEntry) => {
							void runEntryMutation(entry, () => permanentlyDeleteEntry.mutateAsync(entry))
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
