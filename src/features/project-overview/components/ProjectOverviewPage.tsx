import { PlusIcon } from 'lucide-react'

import { BulkActionBar } from '@/features/bulk-action'
import { COMMAND_IDS, CommandShortcut } from '@/features/command'
import { MainCard } from '@/shared/components/main-card/MainCardLayout'
import { Button } from '@/shared/components/base/button'
import { BULK_ACTION_BUTTON_CLASS } from '@/shared/components/patterns/bulk-action'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { PageFrame } from '@/shared/components/page-frame'
import { ProjectBoard } from '@/features/project'

import { useProjectOverviewScene } from '../hooks/useProjectOverviewScene'

/**
 * 项目总览页：组合页面框架与项目集合。
 * wiring 在 {@link useProjectOverviewScene}。
 */
export function ProjectOverviewPage() {
	const scene = useProjectOverviewScene()

	return (
		<PageFrame.Root>
			<PageFrame.Header
				actions={
					<MainCard.GhostAction
						aria-label='创建项目'
						onPress={scene.openProjectCreateDialog}
						tooltipShortcut={<CommandShortcut commandId={COMMAND_IDS.newProject} />}
					>
						<PlusIcon />
					</MainCard.GhostAction>
				}
				breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />}
			/>
			<PageFrame.Toolbar pills={scene.toolbarPills} />
			<PageFrame.Body>
				<ProjectBoard {...scene.projectBoardProps} />
			</PageFrame.Body>
			<PageFrame.BulkBar>
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
			</PageFrame.BulkBar>
		</PageFrame.Root>
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
