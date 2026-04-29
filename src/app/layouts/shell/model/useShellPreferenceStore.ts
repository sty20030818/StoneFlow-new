import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { TaskStatus } from '@/shared/types'

// ----- 常量 -----
const PROJECT_TASK_BOARD_OPEN_SECTIONS_STORAGE_KEY =
	'stoneflow:project-task-board-open-sections:v2'
const DEFAULT_PROJECT_TASK_BOARD_OPEN_SECTIONS: TaskStatus[] = ['todo', 'done']

// ----- 类型 -----
type ShellPreferenceState = {
	projectTreeCollapsed: Record<string, boolean>
	projectTaskBoardOpenSections: TaskStatus[]

	setProjectTreeCollapsed: (payload: {
		spaceId: string
		projectId: string
		collapsed: boolean
	}) => void
	setProjectTaskBoardOpenSections: (sections: TaskStatus[]) => void
}

// ----- Store -----
export const useShellPreferenceStore = create<ShellPreferenceState>()(
	persist(
		(set) => ({
			projectTreeCollapsed: {},
			projectTaskBoardOpenSections: DEFAULT_PROJECT_TASK_BOARD_OPEN_SECTIONS,

			setProjectTreeCollapsed: ({ spaceId, projectId, collapsed }) =>
				set((state) => ({
					projectTreeCollapsed: {
						...state.projectTreeCollapsed,
						[toProjectTreeKey(spaceId, projectId)]: collapsed,
					},
				})),
			setProjectTaskBoardOpenSections: (sections) =>
				set(() => {
					const normalizedSections = sections.length
						? Array.from(
								new Set(
									sections.filter(
										(section) => section === 'todo' || section === 'done',
									),
								),
							)
						: DEFAULT_PROJECT_TASK_BOARD_OPEN_SECTIONS
					return {
						projectTaskBoardOpenSections: normalizedSections,
					}
				}),
		}),
		{
			name: PROJECT_TASK_BOARD_OPEN_SECTIONS_STORAGE_KEY,
			partialize: (state) => ({
				projectTaskBoardOpenSections: state.projectTaskBoardOpenSections,
			}),
		},
	),
)

// ----- Selectors -----
export const selectProjectTreeCollapsed = (state: ShellPreferenceState) =>
	state.projectTreeCollapsed
export const selectProjectTaskBoardOpenSections = (state: ShellPreferenceState) =>
	state.projectTaskBoardOpenSections

// ----- 工具函数 -----
export function toProjectTreeKey(spaceId: string, projectId: string) {
	return `${spaceId}::${projectId}`
}
