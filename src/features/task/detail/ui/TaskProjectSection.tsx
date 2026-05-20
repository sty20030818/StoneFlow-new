import type { AutosaveController } from '@/shared/autosave'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/base/select'
import { DetailFieldRow, DetailSection } from '@/shared/ui/detail'
import type { ProjectOption } from '@/features/project/model/types'
import type { Space } from '@/shared/types'

import {
	applyTaskProjectDraftChange,
	applyTaskSpaceDraftChange,
	type TaskDetailDraft,
} from '../model/taskDetailDraft'

type TaskProjectSectionProps = {
	autosave: AutosaveController<TaskDetailDraft>
	projects: ProjectOption[]
	spaces: Space[]
}

const EMPTY_PROJECT_VALUE = '__task-detail-project-empty__'

export function TaskProjectSection({ autosave, projects, spaces }: TaskProjectSectionProps) {
	const visibleProjects = autosave.draft.spaceId
		? projects.filter((project) => project.spaceId === autosave.draft.spaceId)
		: projects

	return (
		<DetailSection title='归属'>
			<div className='flex flex-col gap-2.5'>
				<DetailFieldRow label='Space'>
					<Select
						onValueChange={(value) =>
							autosave.setDraft(
								(current) => applyTaskSpaceDraftChange(current, value, projects),
								{ saveMode: 'immediate' },
							)
						}
						value={autosave.draft.spaceId}
					>
						<SelectTrigger className='h-7 border-0 bg-transparent px-0 text-[12px] shadow-none focus:ring-0'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent position='popper'>
							<SelectGroup>
								{spaces.map((space) => (
									<SelectItem key={space.id} value={space.id}>
										{space.name}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</DetailFieldRow>

				<DetailFieldRow label='项目'>
					<Select
						onValueChange={(value) =>
							autosave.setDraft(
								(current) =>
									applyTaskProjectDraftChange(
										current,
										value === EMPTY_PROJECT_VALUE ? '' : value,
										projects,
									),
								{ saveMode: 'immediate' },
							)
						}
						value={autosave.draft.projectId || EMPTY_PROJECT_VALUE}
					>
						<SelectTrigger className='h-7 border-0 bg-transparent px-0 text-[12px] shadow-none focus:ring-0'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent position='popper'>
							<SelectGroup>
								<SelectItem value={EMPTY_PROJECT_VALUE}>暂不归类</SelectItem>
								{visibleProjects.map((project) => (
									<SelectItem key={project.id} value={project.id}>
										{project.name}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</DetailFieldRow>
			</div>
		</DetailSection>
	)
}
