import { PlusIcon } from 'lucide-react'
import { Button } from '@heroui/react'

import { COMMAND_IDS, CommandShortcut } from '@/features/command'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { PageFrame } from '@/shared/components/page-frame'
import { ActionTooltip } from '@/shared/components/tooltip'
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
					<ActionTooltip
						label='创建项目'
						shortcut={<CommandShortcut commandId={COMMAND_IDS.newProject} />}
					>
						<Button
							aria-label='创建项目'
							isIconOnly
							onPress={scene.openProjectCreateDialog}
							size='sm'
							type='button'
							variant='ghost'
						>
							<PlusIcon aria-hidden='true' className='size-4' />
						</Button>
					</ActionTooltip>
				}
				breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />}
			/>
			<PageFrame.Toolbar
				onSelectionChange={scene.selectToolbar}
				pills={scene.toolbarPills}
				selectedKey={scene.selectedToolbarKey}
			/>
			<PageFrame.CollectionBody>
				<ProjectBoard {...scene.projectBoardProps} />
			</PageFrame.CollectionBody>
		</PageFrame.Root>
	)
}
