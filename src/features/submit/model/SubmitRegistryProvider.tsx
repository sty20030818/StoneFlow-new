import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type PropsWithChildren,
} from 'react'

export type SubmitTargetContext = {
	source:
		| 'task-create'
		| 'project-create'
		| 'view-editor'
		| 'space-editor'
		| (string & {})
}

export type SubmitTarget = {
	id: string
	title: string
	priority: number
	canSubmit: boolean
	submit: () => void | Promise<void>
	context: SubmitTargetContext
}

type SubmitRegistryActions = {
	registerTarget: (token: symbol, target: SubmitTarget) => void
	clearTargetRegistration: (token: symbol) => void
	submitActiveTarget: () => Promise<boolean>
}

type SubmitRegistryState = {
	activeTarget: SubmitTarget | null
	hasActiveTarget: boolean
}

const SubmitRegistryStateContext = createContext<SubmitRegistryState | null>(null)
const SubmitRegistryActionsContext = createContext<SubmitRegistryActions | null>(null)

export function SubmitRegistryProvider({ children }: PropsWithChildren) {
	const registrationsRef = useRef(new Map<symbol, SubmitTarget>())
	const [activeTarget, setActiveTarget] = useState<SubmitTarget | null>(null)

	function syncActiveTarget() {
		const nextTarget = Array.from(registrationsRef.current.values())
			.filter((target) => target.canSubmit)
			.sort((left, right) => right.priority - left.priority)[0] ?? null

		setActiveTarget(nextTarget)
	}

	const actions = useMemo<SubmitRegistryActions>(
		() => ({
			registerTarget: (token, target) => {
				registrationsRef.current.set(token, target)
				syncActiveTarget()
			},
			clearTargetRegistration: (token) => {
				registrationsRef.current.delete(token)
				syncActiveTarget()
			},
			submitActiveTarget: async () => {
				const target =
					Array.from(registrationsRef.current.values())
						.filter((candidate) => candidate.canSubmit)
						.sort((left, right) => right.priority - left.priority)[0] ?? null

				if (!target) {
					setActiveTarget(null)
					return false
				}

				setActiveTarget(target)
				await target.submit()
				return true
			},
		}),
		[],
	)

	const state = useMemo<SubmitRegistryState>(
		() => ({
			activeTarget,
			hasActiveTarget: activeTarget !== null,
		}),
		[activeTarget],
	)

	return (
		<SubmitRegistryActionsContext.Provider value={actions}>
			<SubmitRegistryStateContext.Provider value={state}>
				{children}
			</SubmitRegistryStateContext.Provider>
		</SubmitRegistryActionsContext.Provider>
	)
}

export function useSubmitRegistryContext() {
	const context = useContext(SubmitRegistryStateContext)
	return context ?? { activeTarget: null, hasActiveTarget: false }
}

export function useSubmitRegistryActions() {
	const actions = useContext(SubmitRegistryActionsContext)

	return (
		actions ?? {
			registerTarget: () => {},
			clearTargetRegistration: () => {},
			submitActiveTarget: async () => false,
		}
	)
}

export function useRegisterSubmitTarget(target: SubmitTarget | null) {
	const actions = useSubmitRegistryActions()
	const tokenRef = useRef<symbol | null>(null)

	if (!tokenRef.current) {
		tokenRef.current = Symbol('submit-target-registration')
	}

	useEffect(() => {
		const token = tokenRef.current!

		if (!target) {
			actions.clearTargetRegistration(token)
			return
		}

		actions.registerTarget(token, target)
		return () => {
			actions.clearTargetRegistration(token)
		}
	}, [actions, target])
}
