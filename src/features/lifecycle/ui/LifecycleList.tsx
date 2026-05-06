import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { EntityScene } from '@/app/layouts/entity-scene'
import { buildScopedSectionPath } from '@/app/layouts/shell/config'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import { deleteLifecycleEntry } from '@/features/lifecycle/api/lifecycle'
import {
	selectArchiveEntries,
	selectTrashEntries,
	useLifecycleStore,
} from '@/features/lifecycle/model/useLifecycleStore'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { emitEvent } from '@/shared/events'
import type { LifecycleEntry, LifecycleMode } from '@/shared/types'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
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
	const permanentlyDeleteEntry = useLifecycleStore((state) => state.permanentlyDeleteEntry)
	const refreshLoadedSlices = useLifecycleStore((state) => state.refreshLoadedSlices)
	const [entityFilter, setEntityFilter] = useState<LifecycleFilter>('all')

	const slice = mode === 'archive' ? archiveEntries : trashEntries
	const lifecyclePills = [
		{ key: 'all', label: `全部 ${slice.items.length}` },
		{
			key: 'space',
			label: `Spaces ${slice.items.filter((entry) => entry.entityType === 'space').length}`,
		},
		{
			key: 'project',
			label: `Projects ${slice.items.filter((entry) => entry.entityType === 'project').length}`,
		},
		{
			key: 'task',
			label: `Tasks ${slice.items.filter((entry) => entry.entityType === 'task').length}`,
		},
	] as const

	useEffect(() => {
		if (mode === 'archive') {
			void loadArchive(scope)
			return
		}

		void loadTrash(scope)
	}, [loadArchive, loadTrash, mode, scope])

	async function handleDeleteFromArchive(entry: LifecycleEntry) {
		if (!window.confirm(`确认将「${entry.title}」移入回收站吗？`)) {
			return
		}

		await deleteLifecycleEntry(entry)
		emitEntryEvent(entry, true)
		await refreshLoadedSlices()
	}

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
		() => buildLifecycleSections(slice.items, entityFilter, mode),
		[entityFilter, mode, slice.items],
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
				},
				boardActions: {
					onDeleteFromArchive:
						mode === 'archive'
							? (entry: LifecycleEntry) => void handleDeleteFromArchive(entry)
							: undefined,
					onEmptyAction: () => {
						void navigate(buildScopedSectionPath(scope, 'inbox', spaceId))
					},
					onOpenDetail: mode === 'archive' ? handleOpenDetail : undefined,
					onPermanentlyDelete:
						mode === 'trash'
							? (entry: LifecycleEntry) => {
									if (!window.confirm(`确认永久删除「${entry.title}」吗？此操作不可恢复。`)) {
										return
									}
									void permanentlyDeleteEntry(entry)
								}
							: undefined,
					onRestore: (entry: LifecycleEntry) => {
						void restoreEntry(entry)
					},
				},
			}}
			breadcrumb={<LifecycleBreadcrumb icon={Icon} title={title} />}
			onRefresh={() => {
				void refreshLoadedSlices()
			}}
			sceneVariant={mode}
			toolbarPills={lifecyclePills.map((pill) => ({
				label: pill.label,
				active: entityFilter === pill.key,
				onClick: () => setEntityFilter(pill.key),
			}))}
		/>
	)
}

function LifecycleBreadcrumb({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<BreadcrumbPage className='inline-flex items-center gap-1.5'>
						<Icon aria-hidden className='size-4 shrink-0 text-(--sf-color-text-tertiary)' />
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
) {
	if (filter === 'space') {
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
				items: entries.filter((entry) => entry.entityType === 'project'),
			},
		]
	}

	if (filter === 'task') {
		return [
			{
				key: 'task',
				label: mode === 'archive' ? '已归档的任务' : '已删除的任务',
				items: entries.filter((entry) => entry.entityType === 'task'),
			},
		]
	}

	return [
		{
			key: 'space',
			label: mode === 'archive' ? '已归档的空间' : '已删除的空间',
			items: entries.filter((entry) => entry.entityType === 'space'),
		},
		{
			key: 'project',
			label: mode === 'archive' ? '已归档的项目' : '已删除的项目',
			items: entries.filter((entry) => entry.entityType === 'project'),
		},
		{
			key: 'task',
			label: mode === 'archive' ? '已归档的任务' : '已删除的任务',
			items: entries.filter((entry) => entry.entityType === 'task'),
		},
	]
}

function emitEntryEvent(entry: LifecycleEntry, deleted: boolean) {
	if (entry.entityType === 'space') {
		emitEvent({
			type: deleted ? 'space:deleted' : 'space:updated',
			payload: { spaceId: entry.id },
		})
	} else if (entry.entityType === 'project') {
		emitEvent({
			type: deleted ? 'project:deleted' : 'project:updated',
			payload: { projectId: entry.id },
		})
	} else {
		emitEvent({
			type: deleted ? 'task:deleted' : 'task:updated',
			payload: { taskId: entry.id },
		})
	}

	emitEvent({
		type: 'lifecycle:changed',
		payload: { entityType: entry.entityType, entityId: entry.id },
	})
}
