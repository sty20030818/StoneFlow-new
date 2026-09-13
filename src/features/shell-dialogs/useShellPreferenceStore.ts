import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 旧全局状态组偏好没有来源身份，不能复制成各工作台的折叠事实。
const TASK_BOARD_COLLAPSED_GROUPS_STORAGE_KEY = 'stoneflow:task-board-collapsed-groups:v1'

// ----- 类型 -----
type ShellPreferenceState = {
	projectTreeCollapsed: Record<string, boolean>
	taskBoardCollapsedGroups: Record<string, string[]>

	setProjectTreeCollapsed: (payload: {
		spaceId: string
		projectId: string
		collapsed: boolean
	}) => void
	setTaskBoardCollapsedGroups: (sourceKey: string, groupKeys: readonly string[]) => void
}

// ----- Store -----
export const useShellPreferenceStore = create<ShellPreferenceState>()(
	persist(
		(set) => ({
			projectTreeCollapsed: {},
			taskBoardCollapsedGroups: {},

			setProjectTreeCollapsed: ({ spaceId, projectId, collapsed }) =>
				set((state) => ({
					projectTreeCollapsed: {
						...state.projectTreeCollapsed,
						[toProjectTreeKey(spaceId, projectId)]: collapsed,
					},
				})),
			setTaskBoardCollapsedGroups: (sourceKey, groupKeys) =>
				set((state) => ({
					taskBoardCollapsedGroups: {
						...state.taskBoardCollapsedGroups,
						[sourceKey]: [...new Set(groupKeys)],
					},
				})),
		}),
		{
			name: TASK_BOARD_COLLAPSED_GROUPS_STORAGE_KEY,
			partialize: (state) => ({
				taskBoardCollapsedGroups: state.taskBoardCollapsedGroups,
			}),
		},
	),
)

// ----- 工具函数 -----
export function toProjectTreeKey(spaceId: string, projectId: string) {
	return `${spaceId}::${projectId}`
}
