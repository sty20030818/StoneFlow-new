import { PlusIcon } from 'lucide-react'

import { COMMAND_IDS, CommandShortcut } from '@/features/command'
import { MainCard } from '@/shared/components/main-card/MainCardLayout'
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
		</PageFrame.Root>
	)
}
