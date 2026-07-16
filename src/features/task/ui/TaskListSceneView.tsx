import { Layers3Icon, PlusIcon } from 'lucide-react'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { DisplayOptionsButton } from '@/features/display-options/ui'
import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import { useTaskListScene, type TaskListSceneVariant } from '@/features/task/hooks/useTaskListScene'
import { AppBreadcrumb } from '@/shared/ui/AppBreadcrumb'

type TaskListSceneViewProps = {
	variant: TaskListSceneVariant
}

/**
 * inbox / all-tasks / no-project 共用场景视图。
 * 业务 wiring 在 useTaskListScene；本组件只拼 EntityScene 槽位。
 */
export function TaskListSceneView({ variant }: TaskListSceneViewProps) {
	const scene = useTaskListScene(variant)

	return (
		<EntityScene
			afterBoard={
				scene.showNoProjectHint ? (
					<div className='mt-auto flex items-center gap-2 px-1 text-[12px] text-sf-text-tertiary'>
						<Layers3Icon className='size-3.5' />
						这些任务已经离开 Inbox，但还没有归属到任何 Project。
					</div>
				) : undefined
			}
			board={scene.board}
			breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />}
			bulkBar={
				<BulkActionBar
					action={<BulkCommandMenuAction />}
					onClear={scene.bulk.clearTaskSelection}
					selectedCount={scene.bulk.selectedCount}
				/>
			}
			headerActions={
				<MainCard.GhostAction aria-label='创建任务' onClick={scene.openCreate}>
					<PlusIcon />
				</MainCard.GhostAction>
			}
			sceneVariant={scene.sceneVariant}
			toolbarDisplayAction={<DisplayOptionsButton pageKey={scene.displayPageKey} />}
			toolbarPills={scene.toolbarPills}
		/>
	)
}
