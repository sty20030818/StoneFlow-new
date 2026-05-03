import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import {
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
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
import type { LifecycleEntry, LifecycleEntityType, LifecycleMode } from '@/shared/types'
import { Button } from '@/shared/ui/base/button'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import type { LucideIcon } from 'lucide-react'

import { LifecycleEntitySection } from './LifecycleEntitySection'

type LifecycleListProps = {
	mode: LifecycleMode
	title: string
	icon: LucideIcon
}

const ENTITY_SECTIONS: Array<{ type: LifecycleEntityType; label: string }> = [
	{ type: 'space', label: 'Spaces' },
	{ type: 'project', label: 'Projects' },
	{ type: 'task', label: 'Tasks' },
]

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

	const slice = mode === 'archive' ? archiveEntries : trashEntries
	const groupedEntries = ENTITY_SECTIONS.map((section) => ({
		...section,
		entries: slice.items.filter((entry) => entry.entityType === section.type),
	}))
	const totalCount = slice.items.length

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

	return (
		<MainCardLayout
			header={<MainCardHeader breadcrumb={<LifecycleBreadcrumb icon={Icon} title={title} />} />}
			toolbar={
				<MainCardToolbar
					pills={groupedEntries.map((section, index) => ({
						label: `${section.label} ${section.entries.length}`,
						active: index === 0,
					}))}
					onRefresh={() => {
						void refreshLoadedSlices()
					}}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col gap-3'>
				{slice.status === 'ready' && totalCount === 0 ? (
					<EmptyPage>
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<Icon />
								</EmptyMedia>
								<EmptyTitle>{title}为空</EmptyTitle>
								<EmptyDescription>
									{mode === 'archive'
										? '归档后的 Space / Project / Task 会在这里集中管理。'
										: '删除后的 Space / Project / Task 会在这里等待恢复或永久删除。'}
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button asChild>
									<Link to={buildScopedSectionPath(scope, 'inbox', spaceId)}>返回收件箱</Link>
								</Button>
							</EmptyContent>
						</Empty>
					</EmptyPage>
				) : (
					groupedEntries.map((section) => (
						<LifecycleEntitySection
							entries={section.entries}
							error={slice.error}
							key={section.type}
							mode={mode}
							onDeleteFromArchive={
								mode === 'archive' ? (entry) => void handleDeleteFromArchive(entry) : undefined
							}
							onOpenDetail={mode === 'archive' ? handleOpenDetail : undefined}
							onPermanentlyDelete={
								mode === 'trash'
									? (entry) => {
											if (!window.confirm(`确认永久删除「${entry.title}」吗？此操作不可恢复。`)) {
												return
											}
											void permanentlyDeleteEntry(entry)
										}
									: undefined
							}
							onRestore={(entry) => {
								void restoreEntry(entry)
							}}
							pendingEntryId={pendingEntryId}
							status={slice.status}
							title={buildSectionTitle(mode, section.label)}
						/>
					))
				)}
			</div>
		</MainCardLayout>
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

function buildSectionTitle(mode: LifecycleMode, entityLabel: string) {
	return mode === 'archive' ? `Archived ${entityLabel}` : `Deleted ${entityLabel}`
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
