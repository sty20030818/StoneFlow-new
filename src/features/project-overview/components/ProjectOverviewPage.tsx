import { PlusIcon } from 'lucide-react'

import { EntityScene } from '@/features/entity-scene'
import { BulkActionBar } from '@/features/bulk-action'
import { MainCard } from '@/shared/components/main-card/MainCardLayout'
import { Button } from '@/shared/components/base/button'
import { BULK_ACTION_BUTTON_CLASS } from '@/shared/components/patterns/bulk-action'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'

import { useProjectOverviewScene } from '../hooks/useProjectOverviewScene'

/**
 * 项目总览页：只拼 EntityScene 槽位。
 * wiring 在 {@link useProjectOverviewScene}。
 */
export function ProjectOverviewPage() {
	const scene = useProjectOverviewScene()

	return (
		<EntityScene
			board={scene.board}
			breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />}
			bulkBar={
				<BulkActionBar
					action={
						<ProjectBulkBarActions
							onArchive={scene.bulk.archiveSelected}
							onDelete={scene.bulk.deleteSelected}
						/>
					}
					onClear={scene.bulk.clearProjectSelection}
					selectedCount={scene.bulk.selectedCount}
				/>
			}
			headerActions={
				<MainCard.GhostAction aria-label='创建项目' onClick={scene.openProjectCreateDialog}>
					<PlusIcon />
				</MainCard.GhostAction>
			}
			toolbarPills={scene.toolbarPills}
		/>
	)
}

function ProjectBulkBarActions({
	onArchive,
	onDelete,
}: {
	onArchive: () => void
	onDelete: () => void
}) {
	return (
		<div className='flex items-center gap-2'>
			<Button
				className={BULK_ACTION_BUTTON_CLASS}
				onClick={onArchive}
				size='sm'
				type='button'
				variant='outline'
			>
				归档
			</Button>
			<Button
				className={BULK_ACTION_BUTTON_CLASS}
				onClick={onDelete}
				size='sm'
				type='button'
				variant='destructive'
			>
				删除
			</Button>
		</div>
	)
}
