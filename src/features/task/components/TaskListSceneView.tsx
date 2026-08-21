import { PlusIcon } from 'lucide-react'
import { Button } from '@heroui/react'

import { PageFrame } from '@/shared/components/page-frame'
import { ActionTooltip } from '@/shared/components/tooltip'
import { DisplayOptionsButton } from '@/features/display-options'
import { FilterBar, ListFilterUiProvider, PageFilterButton } from '@/features/filter'
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
						<ActionTooltip
							label='创建任务'
							shortcut={<CommandShortcut commandId={COMMAND_IDS.newFullTask} />}
						>
							<Button
								aria-label='创建任务'
								isIconOnly
								onPress={scene.openCreate}
								size='sm'
								type='button'
								variant='ghost'
							>
								<PlusIcon aria-hidden='true' />
							</Button>
						</ActionTooltip>
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
			</PageFrame.Root>
		</ListFilterUiProvider>
	)
}
