import type {
	LauncherProjectItem,
	LauncherResultItem,
	LauncherTaskItem,
} from '@/features/launcher/model/types'

/**
 * 搜索结果混排：各自保序，按 task, project, task, project… 交错；
 * 一侧耗尽则追加另一侧剩余。
 */
export function interleaveTaskProjectResults(
	tasks: LauncherTaskItem[],
	projects: LauncherProjectItem[],
): LauncherResultItem[] {
	const result: LauncherResultItem[] = []
	const max = Math.max(tasks.length, projects.length)

	for (let i = 0; i < max; i += 1) {
		const task = tasks[i]
		if (task) {
			result.push({ kind: 'task', ...task })
		}
		const project = projects[i]
		if (project) {
			result.push({ kind: 'project', ...project })
		}
	}

	return result
}
