import { PlusIcon } from 'lucide-react'

import { EntityScene } from '@/features/entity-scene'
import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import { DisplayOptionsButton } from '@/features/display-options'
import { MainCard } from '@/shared/components/main-card/MainCardLayout'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'

import { useViewsScene } from '../hooks/useViewsScene'
import { ViewActionsMenu } from './ViewActionsMenu'
import { ViewEditorDialog } from './ViewEditorDialog'

/**
 * 自定义视图页：只拼 EntityScene 槽位与编辑器。
 * wiring 在 {@link useViewsScene}。
 */
export function ViewsPage() {
	const scene = useViewsScene()

	return (
		<>
			<EntityScene
				board={scene.board}
				breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />}
				bulkBar={
					<BulkActionBar
						action={<BulkCommandMenuAction />}
						onClear={scene.bulk.clearTaskSelection}
						selectedCount={scene.bulk.selectedCount}
					/>
				}
				footer={
					<div className='px-1 text-[12px] text-sf-text-tertiary'>{scene.footerDescription}</div>
				}
				headerActions={
					<MainCard.GhostAction aria-label='创建任务' onClick={scene.openTaskCreateDialog}>
						<PlusIcon />
					</MainCard.GhostAction>
				}
				toolbarDisplayAction={
					scene.activeView ? <DisplayOptionsButton pageKey={scene.displayPageKey} /> : undefined
				}
				toolbarFilterAction={
					<ViewActionsMenu
						activeView={scene.activeView}
						onCreate={scene.openCreateEditor}
						onDelete={scene.actions.onDelete}
						onEdit={scene.openEditEditor}
					/>
				}
				toolbarPills={scene.visibleViews.map((view) => ({
					label: view.name,
					active: view.id === scene.activeView?.id,
					onClick: () => scene.navigateToView(view),
					role: 'tab' as const,
				}))}
			/>

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
