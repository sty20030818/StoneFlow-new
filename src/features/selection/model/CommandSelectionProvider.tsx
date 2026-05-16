import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type PropsWithChildren,
} from 'react'

import {
	createEmptyCommandSelectionContext,
	type CommandSelectionContext,
} from '@/features/command/core'

type CommandSelectionRegistration = CommandSelectionContext

type CommandSelectionActions = {
	registerSelection: (token: symbol, selection: CommandSelectionRegistration) => void
	clearSelectionRegistration: (token: symbol) => void
}

const CommandSelectionStateContext = createContext<CommandSelectionContext | null>(null)
const CommandSelectionActionsContext = createContext<CommandSelectionActions | null>(null)

export function CommandSelectionProvider({ children }: PropsWithChildren) {
	const [selection, setSelection] = useState<CommandSelectionContext>(() =>
		createEmptyCommandSelectionContext(),
	)
	const activeTokenRef = useRef<symbol | null>(null)

	const registerSelection = useCallback(
		(token: symbol, nextSelection: CommandSelectionRegistration) => {
			activeTokenRef.current = token
			setSelection(normalizeCommandSelection(nextSelection))
		},
		[],
	)

	const clearSelectionRegistration = useCallback((token: symbol) => {
		if (activeTokenRef.current !== token) {
			return
		}

		activeTokenRef.current = null
		setSelection(createEmptyCommandSelectionContext())
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
			<CommandSelectionStateContext.Provider value={selection}>
				{children}
			</CommandSelectionStateContext.Provider>
		</CommandSelectionActionsContext.Provider>
	)
}

export function useCommandSelectionContext() {
	const context = useContext(CommandSelectionStateContext)
	if (!context) {
		return createEmptyCommandSelectionContext()
	}
	return context
}

export function useRegisterCommandSelection(selection: CommandSelectionRegistration) {
	const actions = useContext(CommandSelectionActionsContext)
	const tokenRef = useRef<symbol | null>(null)

	if (!tokenRef.current) {
		tokenRef.current = Symbol('command-selection-registration')
	}

	useEffect(() => {
		if (!actions) {
			return
		}

		const token = tokenRef.current!
		actions.registerSelection(token, selection)

		return () => {
			actions.clearSelectionRegistration(token)
		}
	}, [actions, selection])
}

function normalizeCommandSelection(
	selection: CommandSelectionRegistration,
): CommandSelectionContext {
	const ids = selection.entities.map((entity) => entity.id)
	const count = ids.length

	if (count === 0) {
		return createEmptyCommandSelectionContext()
	}

	return {
		...selection,
		type: selection.type,
		ids,
		entities: selection.entities,
		primaryEntity: selection.entities[0],
		source: selection.source,
		hasSelection: true,
		isSingleSelection: count === 1,
		isMultiSelection: count > 1,
	}
}
