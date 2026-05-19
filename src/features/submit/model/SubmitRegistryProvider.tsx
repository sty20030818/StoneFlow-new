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
	source: 'task-create' | 'project-create' | 'view-editor' | 'space-editor' | (string & {})
}

export type SubmitIntent = 'default' | 'continue' | 'open'

export type SubmitTarget = {
	id: string
	title: string
	priority: number
	canSubmit: boolean
	supportedIntents?: SubmitIntent[]
	getIntentDisabledReason?: (intent: SubmitIntent) => string | undefined
	submit: (intent?: SubmitIntent) => void | Promise<void>
	context: SubmitTargetContext
}

type SubmitRegistryActions = {
	registerTarget: (token: symbol, target: SubmitTarget) => void
	clearTargetRegistration: (token: symbol) => void
	submitActiveTarget: (intent?: SubmitIntent) => Promise<boolean>
}

type SubmitRegistryState = {
	activeTarget: SubmitTarget | null
	hasActiveTarget: boolean
	canSubmitIntent: (intent: SubmitIntent) => boolean
	getIntentDisabledReason: (intent: SubmitIntent) => string | undefined
}

const SubmitRegistryStateContext = createContext<SubmitRegistryState | null>(null)
const SubmitRegistryActionsContext = createContext<SubmitRegistryActions | null>(null)

export function SubmitRegistryProvider({ children }: PropsWithChildren) {
	const registrationsRef = useRef(new Map<symbol, SubmitTarget>())
	const [activeTarget, setActiveTarget] = useState<SubmitTarget | null>(null)

	function syncActiveTarget() {
		const nextTarget =
			Array.from(registrationsRef.current.values())
				.filter((target) => target.canSubmit)
				.sort((left, right) => right.priority - left.priority)[0] ?? null

		setActiveTarget(nextTarget)
	}

	function resolveIntentDisabledReason(target: SubmitTarget | null, intent: SubmitIntent) {
		if (!target || !target.canSubmit) {
			return '当前没有可提交内容'
		}

		if (intent === 'default') {
			return undefined
		}

		if (!target.supportedIntents?.includes(intent)) {
			return intent === 'continue' ? '当前表单不支持创建下一条' : '当前表单不支持创建并打开'
		}

		return target.getIntentDisabledReason?.(intent)
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
			submitActiveTarget: async (intent = 'default') => {
				const target =
					Array.from(registrationsRef.current.values())
						.filter((candidate) => candidate.canSubmit)
						.sort((left, right) => right.priority - left.priority)[0] ?? null

				if (!target) {
					setActiveTarget(null)
					return false
				}

				if (resolveIntentDisabledReason(target, intent)) {
					setActiveTarget(target)
					return false
				}

				setActiveTarget(target)
				await target.submit(intent)
				return true
			},
		}),
		[],
	)

	const state = useMemo<SubmitRegistryState>(
		() => ({
			activeTarget,
			hasActiveTarget: activeTarget !== null,
			canSubmitIntent: (intent) => resolveIntentDisabledReason(activeTarget, intent) === undefined,
			getIntentDisabledReason: (intent) => resolveIntentDisabledReason(activeTarget, intent),
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
	return (
		context ?? {
			activeTarget: null,
			hasActiveTarget: false,
			canSubmitIntent: () => false,
			getIntentDisabledReason: () => '当前没有可提交内容',
		}
	)
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
