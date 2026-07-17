import type {
	QuickCreateProjectItem,
	QuickCreateSearchResponse,
	QuickCreateTaskItem,
} from '@/features/quick-create/model/types'
import type { SearchEntitiesResult, SearchProjectItem, SearchTaskItem } from '@/shared/types'

/**
 * 把主窗 searchEntities 结果收成 QC 面板形状：
 * 合并 active + completed，再截断到 limit（与 QC UI 只展示少量结果一致）。
 */
export function mapSearchEntitiesToQuickCreate(
	result: SearchEntitiesResult,
	limit: number,
): QuickCreateSearchResponse {
	const safeLimit = Math.max(1, Math.min(limit, 20))
	return {
		tasks: [...result.tasks.map(mapSearchTask), ...result.completedTasks.map(mapSearchTask)].slice(
			0,
			safeLimit,
		),
		projects: [
			...result.projects.map(mapSearchProject),
			...result.completedProjects.map(mapSearchProject),
		].slice(0, safeLimit),
	}
}

function mapSearchTask(item: SearchTaskItem): QuickCreateTaskItem {
	return {
		id: item.id,
		spaceId: item.spaceId,
		spaceName: item.spaceName,
		projectId: item.projectId,
		projectName: item.projectName,
		inboxAt: item.inboxAt,
		title: item.title,
		note: item.note,
		priority: item.priority,
		status: item.status,
		updatedAt: item.updatedAt,
		completedAt: item.completedAt,
	}
}

function mapSearchProject(item: SearchProjectItem): QuickCreateProjectItem {
	return {
		id: item.id,
		spaceId: item.spaceId,
		spaceName: item.spaceName,
		name: item.name,
		note: item.note,
		updatedAt: item.updatedAt,
		completedAt: item.completedAt,
	}
}
