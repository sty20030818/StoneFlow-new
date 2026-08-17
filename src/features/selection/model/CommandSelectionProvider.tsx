import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
	type PropsWithChildren,
} from 'react'

import {
	createEmptyCommandSelectionContext,
	type CommandSelectionContext,
} from '@/features/command'
import { useLatestRef } from '@/shared/lib/useLatestRef'

type CommandSelectionSnapshotReader = () => CommandSelectionContext

type CommandSelectionSource = {
	readonly getSnapshot: CommandSelectionSnapshotReader
	readonly subscribe: (listener: () => void) => () => void
}

type CommandSelectionActions = {
	registerSelection: (token: symbol, source: CommandSelectionSource) => void
	clearSelectionRegistration: (token: symbol) => void
}

const EMPTY_COMMAND_SELECTION = createEmptyCommandSelectionContext()
const EMPTY_COMMAND_SELECTION_SOURCE: CommandSelectionSource = {
	getSnapshot: () => EMPTY_COMMAND_SELECTION,
	subscribe: () => () => undefined,
}

const CommandSelectionSourceContext = createContext<CommandSelectionSource>(
	EMPTY_COMMAND_SELECTION_SOURCE,
)
const CommandSelectionActionsContext = createContext<CommandSelectionActions | null>(null)

export function CommandSelectionProvider({ children }: PropsWithChildren) {
	const [activeSource, setActiveSource] = useState<CommandSelectionSource>(
		EMPTY_COMMAND_SELECTION_SOURCE,
	)
	const activeTokenRef = useRef<symbol | null>(null)

	const registerSelection = useCallback((token: symbol, source: CommandSelectionSource) => {
		activeTokenRef.current = token
		setActiveSource(source)
	}, [])

	const clearSelectionRegistration = useCallback((token: symbol) => {
		if (activeTokenRef.current !== token) {
			return
		}

		activeTokenRef.current = null
		setActiveSource(EMPTY_COMMAND_SELECTION_SOURCE)
	}, [])

	const actions = useMemo<CommandSelectionActions>(
		() => ({
			registerSelection,
			clearSelectionRegistration,
		}),
		[clearSelectionRegistration, registerSelection],
	)

	return (
		<CommandSelectionActionsContext.Provider value={actions}>
			<CommandSelectionSourceContext.Provider value={activeSource}>
				{children}
			</CommandSelectionSourceContext.Provider>
		</CommandSelectionActionsContext.Provider>
	)
}

export function useCommandSelectionContext() {
	const source = useContext(CommandSelectionSourceContext)
	return useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot)
}

/**
 * 注册当前 collection 的只读命令投影。
 *
 * reader 必须在 owner 未变化时返回同一个快照对象；Provider 只订阅读取，
 * 不复制或持有 selection，从而避免形成第二份可写选择状态。
 */
export function useRegisterCommandSelection(readSelection: CommandSelectionSnapshotReader) {
	const actions = useContext(CommandSelectionActionsContext)
	const tokenRef = useRef(Symbol('command-selection-registration'))
	const readerRef = useLatestRef(readSelection)
	const listenersRef = useRef(new Set<() => void>())

	const currentSnapshot = readSelection()
	const sourceRef = useRef<CommandSelectionSource | null>(null)
	if (!sourceRef.current) {
		sourceRef.current = {
			getSnapshot: () => readerRef.current(),
			subscribe: (listener) => {
				listenersRef.current.add(listener)
				return () => {
					listenersRef.current.delete(listener)
				}
			},
		}
	}
	const source = sourceRef.current

	useLayoutEffect(() => {
		for (const listener of listenersRef.current) {
			listener()
		}
	}, [currentSnapshot])

	useEffect(() => {
		if (!actions) {
			return
		}

		const token = tokenRef.current
		actions.registerSelection(token, source)

		return () => {
			actions.clearSelectionRegistration(token)
		}
	}, [actions, source])
}
