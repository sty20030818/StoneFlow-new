import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { EntityScene } from '@/app/layouts/entity-scene'
import { buildScopedSectionPath } from '@/app/layouts/shell/config'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import {
	BulkActionBar,
	LIFECYCLE_BULK_ACTION_IDS,
	createLifecycleBulkSelectionSnapshot,
	shouldClearBulkSelection,
	showBulkActionResultToast,
	useBulkActionContext,
	type BulkActionId,
} from '@/features/bulk-action'
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
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import type { LifecycleEntry, LifecycleMode, Scope } from '@/shared/types'
import { Button } from '@/shared/ui/base/button'
import { BULK_ACTION_BUTTON_CLASS } from '@/shared/ui/patterns/bulk-action'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import { breadcrumbLeadClass, breadcrumbLeadIconClass } from '@/shared/ui/patterns/breadcrumb'
import type { LucideIcon } from 'lucide-react'

type LifecycleListProps = {
	mode: LifecycleMode
	title: string
	icon: LucideIcon
}

type LifecycleFilter = 'all' | 'space' | 'project' | 'task'

export function LifecycleList({ mode, title, icon: Icon }: LifecycleListProps) {
	const navigate = useNavigate()
	const openDrawer = useDrawerStore((state) => state.openDrawer)
	const { scope, spaceId } = useScopeRoute()
	const archiveEntries = useLifecycleStore(selectArchiveEntries)
	const trashEntries = useLifecycleStore(selectTrashEntries)
	const pendingEntryId = useLifecycleStore((state) => state.pendingEntryId)
	const loadArchive = useLifecycleStore((state) => state.loadArchive)
	const loadTrash = useLifecycleStore((state) => state.loadTrash)
	const restoreEntry = useLifecycleStore((state) => state.restoreEntry)
	const refreshLoadedSlices = useLifecycleStore((state) => state.refreshLoadedSlices)
	const { runBulkAction } = useBulkActionContext()
	const [entityFilter, setEntityFilter] = useState<LifecycleFilter>('all')

	const slice = mode === 'archive' ? archiveEntries : trashEntries
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
	} = useEntitySelection(slice.items.map((entry) => entry.id))
	const selectedEntries = useMemo(
		() => slice.items.filter((entry) => selectedEntryIdSet.has(entry.id)),
		[selectedEntryIdSet, slice.items],
	)
	const commandSelection = useMemo(
		() =>
			buildLifecycleCommandSelection({
				selectedIds: selectionSnapshot.ids,
				entries: slice.items,
				mode,
				clearSelection: clearEntrySelection,
			}),
		[clearEntrySelection, mode, selectionSnapshot.ids, slice.items],
	)
	useRegisterCommandSelection(commandSelection)
	useEntitySelectionEscape({
		hasSelection: selectedCount > 0,
		clearSelection: clearEntrySelection,
	})
	const showSpacePill = scope.type === 'all'
	const scopeItems = showSpacePill
		? slice.items
		: slice.items.filter((entry) => entry.entityType !== 'space')
	const lifecyclePills = [
		{ key: 'all', label: `${mode === 'archive' ? '所有归档' : '所有删除'} ${scopeItems.length}` },
		...(showSpacePill
			? [
					{
						key: 'space' as const,
						label: `空间 ${slice.items.filter((entry) => entry.entityType === 'space').length}`,
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
			openDrawer('task', entry.id)
			return
		}

		if (entry.entityType === 'project') {
			openDrawer('project', entry.id)
			return
		}

		if (entry.spaceId) {
			void navigate(buildScopedSectionPath({ type: 'space', spaceId: entry.spaceId }, 'inbox'))
		}
	}

	const runLifecycleBulkAction = useCallback(
		async (actionId: BulkActionId) => {
			const result = await runBulkAction(
				actionId,
				createLifecycleBulkSelectionSnapshot(selectedEntries, 'bulk-bar'),
			)
			if (shouldClearBulkSelection(result)) {
				clearEntrySelection()
			}
			showBulkActionResultToast(result, { successVerb: '处理', entityLabel: '条目' })
		},
		[clearEntrySelection, runBulkAction, selectedEntries],
	)

	const sections = useMemo(
		() => buildLifecycleSections(slice.items, entityFilter, mode, scope),
		[entityFilter, mode, slice.items, scope],
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
						pendingEntryId,
						selectedEntryIdSet,
						focusedEntryId,
					},
					boardActions: {
						onEmptyAction: () => {
							void navigate(buildScopedSectionPath(scope, 'inbox', spaceId))
						},
						onOpenDetail: mode === 'archive' ? handleOpenDetail : undefined,
						onRestore: (entry: LifecycleEntry) => {
							void restoreEntry(entry)
						},
						onSelectAllEntries: selectEntryIds,
						onToggleEntrySelection: toggleEntrySelection,
						onSetFocusedEntry: setFocusedEntryId,
						onMoveEntryFocus: moveFocus,
						onClearEntrySelection: clearEntrySelection,
					},
				}}
				breadcrumb={<LifecycleBreadcrumb icon={Icon} title={title} />}
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

function LifecycleBreadcrumb({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<BreadcrumbPage className={breadcrumbLeadClass}>
						<Icon aria-hidden className={breadcrumbLeadIconClass} />
						{title}
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
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
