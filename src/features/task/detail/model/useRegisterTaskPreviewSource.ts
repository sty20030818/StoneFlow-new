import { useEffect, useRef } from 'react'

import { useTaskPreviewContext } from './taskPreviewContext'
import type { TaskPreviewSource } from './taskPreviewTypes'

/**
 * 当前列表向预览系统注册「可见任务源」。
 *
 * 入参请保持引用稳定，避免无意义的 effect 重跑。
 */
export function useRegisterTaskPreviewSource(source: TaskPreviewSource) {
	const { registerSource, clearSourceRegistration } = useTaskPreviewContext()
	const tokenRef = useRef<symbol | null>(null)

	if (!tokenRef.current) {
		tokenRef.current = Symbol('task-preview-source')
	}

	useEffect(() => {
		const token = tokenRef.current!
		registerSource(token, source)
	}, [registerSource, source])

	useEffect(() => {
		const token = tokenRef.current!

		return () => {
			clearSourceRegistration(token)
		}
	}, [clearSourceRegistration])
}
