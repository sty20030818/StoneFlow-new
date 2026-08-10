import { createContext, use, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'

import { isGlobalChordPending } from '@/shared/lib/global-chord-guard'
import { useLatestRef } from '@/shared/lib/useLatestRef'

import {
	ShortcutDispatcher,
	type ShortcutDispatchHandler,
	type ShortcutDispatchPriority,
} from './shortcut-dispatcher'

type ShortcutDispatcherContextValue = {
	register: (priority: ShortcutDispatchPriority, handler: ShortcutDispatchHandler) => () => void
}

const ShortcutDispatcherContext = createContext<ShortcutDispatcherContextValue | null>(null)

type ShortcutDispatcherProviderProps = {
	children: ReactNode
}

/** 组合根私有 Provider：全应用只挂载一个 window keydown listener。 */
export function ShortcutDispatcherProvider({ children }: ShortcutDispatcherProviderProps) {
	const dispatcherRef = useRef<ShortcutDispatcher | null>(null)
	if (!dispatcherRef.current) {
		dispatcherRef.current = new ShortcutDispatcher()
	}

	const register = useCallback<ShortcutDispatcherContextValue['register']>((priority, handler) => {
		return dispatcherRef.current!.register(priority, handler)
	}, [])
	const contextValue = useMemo(() => ({ register }), [register])

	useEffect(() => {
		const dispatcher = dispatcherRef.current!
		const handleKeyDown = (event: KeyboardEvent) => {
			dispatcher.dispatch(event, { globalChordPending: isGlobalChordPending() })
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [])

	return <ShortcutDispatcherContext value={contextValue}>{children}</ShortcutDispatcherContext>
}

/** 注册一个显式优先级的快捷键处理器；返回 handled 后停止向低优先级分发。 */
export function useShortcutDispatcher(
	priority: ShortcutDispatchPriority,
	handler: ShortcutDispatchHandler,
) {
	const dispatcher = use(ShortcutDispatcherContext)
	if (!dispatcher) {
		throw new Error('useShortcutDispatcher 必须在 ShortcutRegistryProvider 内使用')
	}

	const handlerRef = useLatestRef(handler)

	useEffect(
		() => dispatcher.register(priority, (event) => handlerRef.current(event)),
		[dispatcher, handlerRef, priority],
	)
}
