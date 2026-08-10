import { PlusIcon } from 'lucide-react'

import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import { COMMAND_IDS, CommandShortcut } from '@/features/command'
import { DisplayOptionsButton } from '@/features/display-options'
import { FilterBar, ListFilterUiProvider, PageFilterButton } from '@/features/filter'
import { MainCard } from '@/shared/components/main-card/MainCardLayout'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { PageFrame } from '@/shared/components/page-frame'
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
						<MainCard.GhostAction
							aria-label='创建任务'
							onClick={scene.openTaskCreateDialog}
							tooltipShortcut={<CommandShortcut commandId={COMMAND_IDS.newFullTask} />}
						>
							<PlusIcon />
						</MainCard.GhostAction>
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
						onClick: () => scene.navigateToView(view),
						role: 'tab' as const,
					}))}
				/>
				<PageFrame.Body>
					<TaskBoard {...scene.taskCollection.boardProps} />
				</PageFrame.Body>
				<PageFrame.Footer>
					<div className='px-1 text-[12px] text-sf-text-tertiary'>{scene.footerDescription}</div>
				</PageFrame.Footer>
				<PageFrame.BulkBar>
					<BulkActionBar
						action={<BulkCommandMenuAction />}
						onClear={scene.bulk.clearTaskSelection}
						selectedCount={scene.bulk.selectedCount}
					/>
				</PageFrame.BulkBar>
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
