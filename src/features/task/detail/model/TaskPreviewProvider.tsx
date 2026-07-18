import { type PropsWithChildren } from 'react'

import { TaskPreviewContext } from './taskPreviewContext'
import { useTaskPreviewStore } from './useTaskPreviewStore'

export type { TaskPreviewAnchorReason } from './taskPreviewTypes'
export { useTaskPreviewContext } from './taskPreviewContext'
export { useRegisterTaskPreviewSource } from './useRegisterTaskPreviewSource'

/**
 * 任务预览上下文 Provider（须挂主壳树）。
 */
export function TaskPreviewProvider({ children }: PropsWithChildren) {
	const value = useTaskPreviewStore()
	return <TaskPreviewContext.Provider value={value}>{children}</TaskPreviewContext.Provider>
}
