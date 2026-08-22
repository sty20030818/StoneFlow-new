import { Button, Skeleton } from '@heroui/react'
import { EmptyState } from '@heroui-pro/react'
import { AlertCircleIcon, ArrowLeftIcon, BookmarkXIcon, PlusIcon } from 'lucide-react'

import { COMMAND_IDS, CommandShortcut } from '@/features/command'
import { TaskBoard } from '@/features/task'
import { TaskWorkspace } from '@/features/task-workspace'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { PageFrame } from '@/shared/components/page-frame'
import { ActionTooltip } from '@/shared/components/tooltip'

import { useSavedViewWorkspaceScene } from '../hooks/useViewsScene'
import { ViewActionsMenu } from './ViewActionsMenu'
import { ViewEditorDialog } from './ViewEditorDialog'

/** `/views/:viewId`：执行一个持久化 Saved View，并复用统一 Task Workspace。 */
export function SavedViewPage() {
	const scene = useSavedViewWorkspaceScene()

	if (scene.viewStatus !== 'ready' || !scene.activeView) {
		return <SavedViewPageState scene={scene} />
	}

	return (
		<>
			<TaskWorkspace
				breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />}
				displayPageKey={scene.displayPageKey}
				filterUiValue={scene.filterUiValue}
				headerActions={
					<>
						<ActionTooltip
							label='创建任务'
							shortcut={<CommandShortcut commandId={COMMAND_IDS.newFullTask} />}
						>
							<Button
								aria-label='创建任务'
								isIconOnly
								onPress={scene.openTaskCreateDialog}
								size='sm'
								type='button'
								variant='outline'
							>
								<PlusIcon aria-hidden='true' className='size-4' />
							</Button>
						</ActionTooltip>
						<ViewActionsMenu
							activeView={scene.activeView}
							onDelete={() => void scene.deleteActiveView()}
							onEdit={scene.editor.openEdit}
						/>
					</>
				}
				onViewChange={scene.selectToolbar}
				selectedViewKey={scene.selectedToolbarKey}
				views={scene.toolbarPills}
			>
				<TaskBoard {...scene.taskCollection.boardProps} />
			</TaskWorkspace>

			<ViewEditorDialog
				isSubmitting={scene.editor.isSubmitting}
				onClose={scene.editor.onClose}
				onCreate={scene.editor.onCreate}
				onUpdate={scene.editor.onUpdate}
				open={scene.editor.open}
				projects={scene.editor.projects}
				view={scene.editor.view}
			/>
		</>
	)
}

type WorkspaceScene = ReturnType<typeof useSavedViewWorkspaceScene>

function SavedViewPageState({ scene }: { scene: WorkspaceScene }) {
	const invalidDefinition = scene.viewStatus === 'invalid-definition'
	return (
		<PageFrame.Root>
			<PageFrame.Header breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />} />
			<PageFrame.Body>
				{scene.viewStatus === 'loading' ? (
					<div aria-label='正在加载保存视图' className='grid gap-2'>
						<Skeleton className='h-9' />
						<Skeleton className='h-11' />
						<Skeleton className='h-11' />
					</div>
				) : (
					<EmptyState className='mx-auto my-auto max-w-md'>
						<EmptyState.Header>
							{scene.viewStatus === 'error' || invalidDefinition ? (
								<AlertCircleIcon />
							) : (
								<BookmarkXIcon />
							)}
							<EmptyState.Title>
								{scene.viewStatus === 'error'
									? '读取保存视图失败'
									: invalidDefinition
										? '保存视图需要重建'
										: '找不到保存视图'}
							</EmptyState.Title>
							<EmptyState.Description>
								{scene.viewStatus === 'error'
									? '保存视图暂时无法读取，请稍后重试。'
									: invalidDefinition
										? '这个旧视图的筛选条件无法无损升级，请返回视图库删除后重新创建。'
										: '它可能已被删除，或不属于当前范围。'}
							</EmptyState.Description>
						</EmptyState.Header>
						<EmptyState.Content>
							<ActionTooltip label='返回保存视图'>
								<Button
									aria-label='返回保存视图'
									isIconOnly
									onPress={scene.openLibrary}
									size='sm'
									type='button'
									variant='outline'
								>
									<ArrowLeftIcon aria-hidden='true' className='size-4' />
								</Button>
							</ActionTooltip>
						</EmptyState.Content>
					</EmptyState>
				)}
			</PageFrame.Body>
		</PageFrame.Root>
	)
}
