import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { EntityScene } from '@/app/layouts/entity-scene'
import { buildScopedSectionPath } from '@/app/layouts/shell/config'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import {
	selectArchiveEntries,
	selectTrashEntries,
	useLifecycleStore,
} from '@/features/lifecycle/model/useLifecycleStore'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import type { LifecycleEntry, LifecycleMode, Scope } from '@/shared/types'
import { Button } from '@/shared/ui/base/button'
import { BulkActionBar } from '@/shared/ui/bulk-action-bar'
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
	const [entityFilter, setEntityFilter] = useState<LifecycleFilter>('all')

	const slice = mode === 'archive' ? archiveEntries : trashEntries
	const {
		selectedTaskIdSet: selectedEntryIdSet,
		selectedCount,
		toggleTaskSelection: toggleEntrySelection,
		clearTaskSelection,
	} = useTaskSelection(slice.items.map((entry) => entry.id))
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

	const sections = useMemo(
		() => buildLifecycleSections(slice.items, entityFilter, mode, scope),
		[entityFilter, mode, slice.items, scope],
	)

	return (
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
				},
				boardActions: {
					onEmptyAction: () => {
						void navigate(buildScopedSectionPath(scope, 'inbox', spaceId))
					},
					onOpenDetail: mode === 'archive' ? handleOpenDetail : undefined,
					onRestore: (entry: LifecycleEntry) => {
						void restoreEntry(entry)
					},
					onToggleEntrySelection: toggleEntrySelection,
				},
			}}
			breadcrumb={<LifecycleBreadcrumb icon={Icon} title={title} />}
			bulkBar={
				<BulkActionBar
					action={
						<Button className={BULK_ACTION_BUTTON_CLASS} size='sm' variant='outline'>
							批量操作
						</Button>
					}
					onClear={clearTaskSelection}
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
