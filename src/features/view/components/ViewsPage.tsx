import { PlusIcon } from 'lucide-react'
import { Button } from '@heroui/react'

import { COMMAND_IDS, CommandShortcut } from '@/features/command'
import { DisplayOptionsButton } from '@/features/display-options'
import { FilterBar, ListFilterUiProvider, PageFilterButton } from '@/features/filter'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { PageFrame } from '@/shared/components/page-frame'
import { ActionTooltip } from '@/shared/components/tooltip'
import { TaskBoard } from '@/features/task'

import { useViewsScene } from '../hooks/useViewsScene'
import { ViewActionsMenu } from './ViewActionsMenu'
import { ViewEditorDialog } from './ViewEditorDialog'

/**
 * 自定义视图页：组合页面框架、任务集合与编辑器。
 * wiring 在 {@link useViewsScene}。
 */
export function ViewsPage() {
	const scene = useViewsScene()

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
								onPress={scene.openTaskCreateDialog}
								size='sm'
								type='button'
								variant='primary'
							>
								<PlusIcon className='size-4' />
								<span>新建任务</span>
							</Button>
						</ActionTooltip>
					}
					breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />}
				/>
				<PageFrame.Toolbar
					displayAction={
						scene.activeView ? <DisplayOptionsButton pageKey={scene.displayPageKey} /> : undefined
					}
					filterAction={
						scene.activeView ? (
							<div className='flex items-center gap-1'>
								<PageFilterButton />
								<ViewActionsMenu
									activeView={scene.activeView}
									onCreate={scene.openCreateEditor}
									onDelete={scene.actions.onDelete}
									onEdit={scene.openEditEditor}
								/>
							</div>
						) : (
							<ViewActionsMenu
								activeView={scene.activeView}
								onCreate={scene.openCreateEditor}
								onDelete={scene.actions.onDelete}
								onEdit={scene.openEditEditor}
							/>
						)
					}
					filterBar={scene.activeView ? <FilterBar /> : null}
					pills={scene.visibleViews.map((view) => ({
						label: view.name,
						active: view.id === scene.activeView?.id,
						onPress: () => scene.navigateToView(view),
					}))}
				/>
				<PageFrame.VirtualizedBody>
					<TaskBoard {...scene.taskCollection.boardProps} />
				</PageFrame.VirtualizedBody>
			</PageFrame.Root>

			<ViewEditorDialog
				isSubmitting={scene.editor.isSubmitting}
				onClose={scene.editor.onClose}
				onCreate={scene.editor.onCreate}
				onUpdate={scene.editor.onUpdate}
				open={scene.editor.open}
				projects={scene.editor.projects}
				view={scene.editor.view}
			/>
		</ListFilterUiProvider>
	)
}
