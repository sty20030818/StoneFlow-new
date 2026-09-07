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
 * 注册边界会缓存语义等价的快照，允许 owner 重建只读容器，同时保证
 * useSyncExternalStore 在实际 selection 未变化时读到稳定引用。
 */
export function useRegisterCommandSelection(readSelection: CommandSelectionSnapshotReader) {
	const actions = useContext(CommandSelectionActionsContext)
	const tokenRef = useRef(Symbol('command-selection-registration'))
	const listenersRef = useRef(new Set<() => void>())

	const nextSnapshot = readSelection()
	const snapshotRef = useRef(nextSnapshot)
	const [source] = useState<CommandSelectionSource>(() => ({
		getSnapshot: () => snapshotRef.current,
		subscribe: (listener) => {
			listenersRef.current.add(listener)
			return () => {
				listenersRef.current.delete(listener)
			}
		},
	}))

	useLayoutEffect(() => {
		if (areSameCommandSelection(snapshotRef.current, nextSnapshot)) {
			return
		}

		snapshotRef.current = nextSnapshot
		for (const listener of listenersRef.current) {
			listener()
		}
	}, [nextSnapshot])

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

function areSameCommandSelection(current: CommandSelectionContext, next: CommandSelectionContext) {
	return (
		current === next ||
		(current.type === next.type &&
			areSameValues(current.ids, next.ids) &&
			areSameEntities(current.entities, next.entities) &&
			areSameEntity(current.primaryEntity, next.primaryEntity) &&
			current.clearSelection === next.clearSelection &&
			current.focusedId === next.focusedId &&
			current.focusedType === next.focusedType &&
			current.source === next.source &&
			current.hasSelection === next.hasSelection &&
			current.isSingleSelection === next.isSingleSelection &&
			current.isMultiSelection === next.isMultiSelection)
	)
}

function areSameValues<T>(current: readonly T[], next: readonly T[]) {
	return (
		current === next ||
		(current.length === next.length && current.every((value, index) => value === next[index]))
	)
}

function areSameEntities(
	current: CommandSelectionContext['entities'],
	next: CommandSelectionContext['entities'],
) {
	return (
		current === next ||
		(current.length === next.length &&
			current.every((entity, index) => areSameEntity(entity, next[index])))
	)
}

function areSameEntity(
	current: CommandSelectionContext['primaryEntity'],
	next: CommandSelectionContext['primaryEntity'],
) {
	return (
		current === next ||
		Boolean(
			current &&
			next &&
			current.id === next.id &&
			current.type === next.type &&
			current.title === next.title &&
			current.subtitle === next.subtitle &&
			current.spaceId === next.spaceId &&
			current.projectId === next.projectId &&
			current.dueAt === next.dueAt &&
			current.status === next.status &&
			current.priority === next.priority &&
			current.lifecycleMode === next.lifecycleMode &&
			current.lifecycleEntityType === next.lifecycleEntityType &&
			current.projectStatus === next.projectStatus,
		)
	)
}
