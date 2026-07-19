import { useEffect, useState } from 'react'

import { useTaskPreviewContext } from './taskPreviewContext'
import type { TaskPreviewSource } from './taskPreviewTypes'

/**
 * 当前列表向预览系统注册「可见任务源」。
 *
 * effect 依赖拆成字段，避免调用方每次新建 source 对象导致无意义重跑。
 */
export function useRegisterTaskPreviewSource(source: TaskPreviewSource) {
	const { registerSource, clearSourceRegistration } = useTaskPreviewContext()
	const [token] = useState(() => Symbol('task-preview-source'))

	const { tasks, focusedTaskId, activeTaskId } = source

	useEffect(() => {
		registerSource(token, { tasks, focusedTaskId, activeTaskId })
	}, [registerSource, tasks, focusedTaskId, activeTaskId, token])

	useEffect(() => {
		return () => {
			clearSourceRegistration(token)
		}
	}, [clearSourceRegistration, token])
}
