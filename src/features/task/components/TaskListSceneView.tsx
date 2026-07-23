import { Layers3Icon, PlusIcon } from 'lucide-react'

import { EntityScene } from '@/features/entity-scene'
import { MainCard } from '@/shared/components/main-card/MainCardLayout'
import { DisplayOptionsButton } from '@/features/display-options'
import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import { useTaskListScene, type TaskListSceneVariant } from '@/features/task/hooks/useTaskListScene'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'

type TaskListSceneViewProps = {
	variant: TaskListSceneVariant
}

/**
 * 全部任务 / 独立事项 共用场景视图。
 *
 * 业务 wiring 在 {@link useTaskListScene}；本组件只拼 EntityScene 槽位。
 * routes 薄页应：`import { TaskListSceneView } from '@/features/task'`。
 *
 * @public 经 `@/features/task` 导出
 */
export function TaskListSceneView({ variant }: TaskListSceneViewProps) {
	const scene = useTaskListScene(variant)

	return (
		<EntityScene
			afterBoard={
				scene.showStandaloneHint ? (
					<div className='mt-auto flex items-center gap-2 px-1 text-[12px] text-sf-text-tertiary'>
						<Layers3Icon className='size-3.5' />
						这些是当前 Space 下尚未归属到任何 Project 的独立事项。
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
			toolbarDisplayAction={<DisplayOptionsButton pageKey={scene.displayPageKey} />}
			toolbarPills={scene.toolbarPills}
		/>
	)
}
