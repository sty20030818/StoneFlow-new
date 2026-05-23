import type { CommandSelectionContext } from '@/features/command/core'
import type {
	LifecycleEntry,
	LifecycleMode,
	ProjectOverviewItem,
	TaskListItem,
} from '@/shared/types'

type BuildTaskCommandSelectionInput = {
	selectedIds: string[]
	tasks: TaskListItem[]
	fallbackSubtitle: string | ((task: TaskListItem) => string)
	focusedTaskId?: string | null
	clearSelection?: () => void
}

type BuildLifecycleCommandSelectionInput = {
	selectedIds: string[]
	entries: LifecycleEntry[]
	mode: LifecycleMode
	clearSelection?: () => void
}

type BuildProjectCommandSelectionInput = {
	selectedIds: string[]
	projects: ProjectOverviewItem[]
	clearSelection?: () => void
}

export function buildTaskCommandSelection({
	selectedIds,
	tasks,
	fallbackSubtitle,
	focusedTaskId = null,
	clearSelection,
}: BuildTaskCommandSelectionInput): CommandSelectionContext {
	const taskById = new Map(tasks.map((task) => [task.id, task]))
	const entities = selectedIds.flatMap((taskId) => {
		const task = taskById.get(taskId)
		if (!task) {
			return []
		}

		return [
			{
				id: task.id,
				type: 'task' as const,
				title: task.title,
				subtitle:
					task.projectName ??
					(typeof fallbackSubtitle === 'function' ? fallbackSubtitle(task) : fallbackSubtitle),
				spaceId: task.spaceId,
				projectId: task.projectId,
				inboxAt: task.inboxAt,
				dueAt: task.dueAt,
				status: task.status,
				priority: String(task.priority),
			},
		]
	})
	const ids = entities.map((entity) => entity.id)
	const count = ids.length
	const focusedTask = focusedTaskId ? taskById.get(focusedTaskId) ?? null : null

	return {
		type: count > 0 ? 'task' : undefined,
		ids,
		entities,
		primaryEntity: entities[0],
		focusedId: focusedTask?.id,
		focusedType: focusedTask ? 'task' : undefined,
		clearSelection,
		source: count > 0 ? 'task-list' : 'none',
		hasSelection: count > 0,
		isSingleSelection: count === 1,
		isMultiSelection: count > 1,
	}
}

export function buildLifecycleCommandSelection({
	selectedIds,
	entries,
	mode,
	clearSelection,
}: BuildLifecycleCommandSelectionInput): CommandSelectionContext {
	const entryById = new Map(entries.map((entry) => [entry.id, entry]))
	const entities = selectedIds.flatMap((entryId) => {
		const entry = entryById.get(entryId)
		if (!entry) {
			return []
		}

		return [
			{
				id: entry.id,
				type: 'lifecycle' as const,
				title: entry.title,
				subtitle: getLifecycleEntrySubtitle(entry),
				lifecycleMode: mode,
				lifecycleEntityType: entry.entityType,
			},
		]
	})
	const ids = entities.map((entity) => entity.id)
	const count = ids.length

	return {
		type: count > 0 ? 'lifecycle' : undefined,
		ids,
		entities,
		primaryEntity: entities[0],
		clearSelection,
		source: count > 0 ? 'lifecycle-list' : 'none',
		hasSelection: count > 0,
		isSingleSelection: count === 1,
		isMultiSelection: count > 1,
	}
}

export function buildProjectCommandSelection({
	selectedIds,
	projects,
	clearSelection,
}: BuildProjectCommandSelectionInput): CommandSelectionContext {
	const projectById = new Map(projects.map((project) => [project.id, project]))
	const entities = selectedIds.flatMap((projectId) => {
		const project = projectById.get(projectId)
		if (!project) {
			return []
		}

		return [
			{
				id: project.id,
				type: 'project' as const,
				title: project.name,
				subtitle: getProjectSubtitle(project),
				projectStatus: getProjectStatus(project),
			},
		]
	})
	const ids = entities.map((entity) => entity.id)
	const count = ids.length

	return {
		type: count > 0 ? 'project' : undefined,
		ids,
		entities,
		primaryEntity: entities[0],
		clearSelection,
		source: count > 0 ? 'project-list' : 'none',
		hasSelection: count > 0,
		isSingleSelection: count === 1,
		isMultiSelection: count > 1,
	}
}

function getLifecycleEntrySubtitle(entry: LifecycleEntry) {
	if (entry.entityType === 'space') {
		return '空间'
	}

	if (entry.entityType === 'project') {
		return entry.spaceName ? `项目 · ${entry.spaceName}` : '项目'
	}

	return entry.projectName ?? entry.spaceName ?? '任务'
}

function getProjectSubtitle(project: ProjectOverviewItem) {
	const statusLabel = getProjectStatusLabel(project)
	return project.spaceName ? `${statusLabel} · ${project.spaceName}` : statusLabel
}

function getProjectStatus(project: ProjectOverviewItem) {
	if (project.archivedAt) {
		return 'archived' as const
	}
	if (project.completedAt) {
		return 'completed' as const
	}
	return 'active' as const
}

function getProjectStatusLabel(project: ProjectOverviewItem) {
	switch (getProjectStatus(project)) {
		case 'archived':
			return '已归档项目'
		case 'completed':
			return '已完成项目'
		default:
			return '进行中项目'
	}
}
