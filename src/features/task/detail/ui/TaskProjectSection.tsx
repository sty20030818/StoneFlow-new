import type { AutosaveController } from '@/shared/autosave'
import { buttonVariants } from '@/shared/ui/base/button'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from '@/shared/ui/base/select'
import { cn } from '@/shared/lib/utils'
import { DetailSection } from '@/shared/ui/detail'
import type { ProjectOption } from '@/features/project/model/types'

import {
	applyTaskProjectDraftChange,
	type TaskDetailDraft,
} from '../model/taskDetailDraft'

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

	return (
		<DetailSection title='项目'>
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
				<SelectTrigger
					aria-label='项目'
					className={cn(
						buttonVariants({ variant: 'outline', size: 'sm' }),
						'h-8 w-full justify-start rounded-md px-2 text-[12px]',
					)}
				>
					<span className='truncate'>{currentProject?.name ?? '暂不归类'}</span>
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
		</DetailSection>
	)
}
