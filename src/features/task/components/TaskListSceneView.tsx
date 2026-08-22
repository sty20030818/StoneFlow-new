import { PlusIcon } from 'lucide-react'
import { Button } from '@heroui/react'

import { ActionTooltip } from '@/shared/components/tooltip'
import { COMMAND_IDS, CommandShortcut } from '@/features/command'
import { useTaskListScene, type TaskListSceneVariant } from '@/features/task/hooks/useTaskListScene'
import { TaskWorkspace } from '@/features/task-workspace'
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
		<TaskWorkspace
			breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />}
			displayPageKey={scene.displayPageKey}
			filterUiValue={scene.filterUiValue}
			headerActions={
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
						variant='outline'
					>
						<PlusIcon aria-hidden='true' />
					</Button>
				</ActionTooltip>
			}
			onViewChange={scene.selectToolbar}
			selectedViewKey={scene.selectedToolbarKey}
			views={scene.toolbarPills}
		>
			<TaskBoard {...scene.taskCollection.boardProps} />
		</TaskWorkspace>
	)
}
