import type { LauncherProjectItem, LauncherSearchResponse, LauncherTaskItem } from '../model/types'
import type { SearchEntitiesResult, SearchProjectItem, SearchTaskItem } from '@/shared/types'

/**
 * 把主窗 searchEntities 结果收成 Launcher 面板形状：
 * 合并 active + completed，再截断到 limit。
 */
export function mapSearchEntitiesToLauncher(
	result: SearchEntitiesResult,
	limit: number,
): LauncherSearchResponse {
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

function mapSearchTask(item: SearchTaskItem): LauncherTaskItem {
	return {
		id: item.id,
		spaceId: item.spaceId,
		spaceName: item.spaceName,
		projectId: item.projectId,
		projectName: item.projectName,
		title: item.title,
		note: item.note,
		priority: item.priority,
		status: item.status,
		updatedAt: item.updatedAt,
		completedAt: item.completedAt,
	}
}

function mapSearchProject(item: SearchProjectItem): LauncherProjectItem {
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
