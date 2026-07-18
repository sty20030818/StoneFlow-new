import { createContext, useContext } from 'react'

import type { TaskPreviewContextValue } from './taskPreviewTypes'

export const TaskPreviewContext = createContext<TaskPreviewContextValue | null>(null)

export function useTaskPreviewContext() {
	const context = useContext(TaskPreviewContext)
	if (!context) {
		throw new Error('useTaskPreviewContext must be used within TaskPreviewProvider')
	}

	return context
}
