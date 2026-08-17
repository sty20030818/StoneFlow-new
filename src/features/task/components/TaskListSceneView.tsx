import { PlusIcon } from 'lucide-react'

import { PageFrame } from '@/shared/components/page-frame'
import { MainCard } from '@/shared/components/main-card/MainCardLayout'
import { DisplayOptionsButton } from '@/features/display-options'
import { FilterBar, ListFilterUiProvider, PageFilterButton } from '@/features/filter'
import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import { COMMAND_IDS, CommandShortcut } from '@/features/command'
import { useTaskListScene, type TaskListSceneVariant } from '@/features/task/hooks/useTaskListScene'
import { TaskBoard } from './TaskBoard'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'

type TaskListSceneViewProps = {
	variant: TaskListSceneVariant
}

/**
 * 全部任务 / 独立事项 共用场景视图。
 *
 * 业务 wiring 在 {@link useTaskListScene}；本组件只组合页面框架与任务集合。
 * routes 薄页应：`import { TaskListSceneView } from '@/features/task'`。
 *
 * @public 经 `@/features/task` 导出
 */
export function TaskListSceneView({ variant }: TaskListSceneViewProps) {
	const scene = useTaskListScene(variant)

	return (
		<ListFilterUiProvider value={scene.filterUiValue}>
			<PageFrame.Root>
				<PageFrame.Header
					actions={
						<MainCard.GhostAction
							aria-label='创建任务'
							onPress={scene.openCreate}
							tooltipShortcut={<CommandShortcut commandId={COMMAND_IDS.newFullTask} />}
						>
							<PlusIcon />
						</MainCard.GhostAction>
					}
					breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />}
				/>
				<PageFrame.Toolbar
					displayAction={<DisplayOptionsButton pageKey={scene.displayPageKey} />}
					filterAction={<PageFilterButton />}
					filterBar={<FilterBar />}
					pills={scene.toolbarPills}
				/>
				<PageFrame.VirtualizedBody>
					<TaskBoard {...scene.taskCollection.boardProps} />
				</PageFrame.VirtualizedBody>
				<PageFrame.BulkBar>
					<BulkActionBar
						action={<BulkCommandMenuAction />}
						onClear={scene.bulk.clearTaskSelection}
						selectedCount={scene.bulk.selectedCount}
					/>
				</PageFrame.BulkBar>
			</PageFrame.Root>
		</ListFilterUiProvider>
	)
}
