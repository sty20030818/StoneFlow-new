import type { AutosaveController } from '@/shared/autosave'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import {
	DetailFieldRow,
	DetailMetaButton,
} from '@/shared/ui/detail'
import { buildDigitShortcutMap, ShortcutDigitSelectLayer } from '@/shared/ui/shortcut-menu'
import type { ProjectOption } from '@/features/project/model/types'
import { FolderIcon, TargetIcon } from 'lucide-react'

import {
	applyTaskProjectDraftChange,
	type TaskDetailDraft,
} from '../model/taskDetailDraft'
import {
	DetailMenuOptionRow,
	getDetailMenuOptionIndicator,
} from './taskDetailMenuUtils'

type TaskProjectSectionProps = {
	autosave: AutosaveController<TaskDetailDraft>
	projects: ProjectOption[]
}

const EMPTY_PROJECT_VALUE = '__task-detail-project-empty__'

export function TaskProjectSection({ autosave, projects }: TaskProjectSectionProps) {
	const visibleProjects = autosave.draft.spaceId
		? projects.filter((project) => project.spaceId === autosave.draft.spaceId)
		: projects
	const currentProject = projects.find((project) => project.id === autosave.draft.projectId)
	const shortcutItems = [
		{ label: '独立事项', value: EMPTY_PROJECT_VALUE, disabled: false, isEmptyValue: true },
		...visibleProjects.map((project) => ({
			label: project.name,
			value: project.id,
			disabled: false,
		})),
	]
	const digitShortcutMap = buildDigitShortcutMap(shortcutItems)
	const currentProjectValue = autosave.draft.projectId || EMPTY_PROJECT_VALUE

	return (
		<DetailFieldRow className='items-center' label='项目' labelClassName='pt-0'>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<DetailMetaButton
						aria-label='项目'
						icon={
							currentProject ? (
								<FolderIcon className='size-3.5' />
							) : (
								<TargetIcon className='size-3.5' />
							)
						}
						label={currentProject?.name ?? '独立事项'}
					/>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='start' data-drawer-owned-overlay='true' sideOffset={6}>
					<ShortcutDigitSelectLayer
						items={shortcutItems}
						onSelect={(item) =>
							autosave.setDraft(
								(current) =>
									applyTaskProjectDraftChange(
										current,
										item.value === EMPTY_PROJECT_VALUE ? '' : String(item.value),
										projects,
									),
								{ saveMode: 'immediate' },
							)
						}
					/>
					<DropdownMenuLabel>项目</DropdownMenuLabel>
					<DropdownMenuGroup>
						<DropdownMenuItem
							className='gap-2 p-2'
							onSelect={() =>
								autosave.setDraft(
									(current) => applyTaskProjectDraftChange(current, '', projects),
									{ saveMode: 'immediate' },
								)
							}
						>
							<DetailMenuOptionRow
								digit={digitShortcutMap[0]?.digit ?? ''}
								icon={<TargetIcon className='size-3.5' />}
								indicator={getDetailMenuOptionIndicator(new Set([currentProjectValue]), EMPTY_PROJECT_VALUE)}
								label='独立事项'
							/>
						</DropdownMenuItem>
						{visibleProjects.map((project, index) => (
							<DropdownMenuItem
								className='gap-2 p-2'
								key={project.id}
								onSelect={() =>
									autosave.setDraft(
										(current) =>
											applyTaskProjectDraftChange(current, project.id, projects),
										{ saveMode: 'immediate' },
									)
								}
							>
								<DetailMenuOptionRow
									digit={digitShortcutMap[index + 1]?.digit ?? ''}
									icon={<FolderIcon className='size-3.5' />}
									indicator={getDetailMenuOptionIndicator(new Set([currentProjectValue]), project.id)}
									label={project.name}
								/>
							</DropdownMenuItem>
						))}
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</DetailFieldRow>
	)
}
