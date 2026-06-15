import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useSyncExternalStore,
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

type SubmitRegistrySnapshot = {
	hasActiveTarget: boolean
	canSubmitDefault: boolean
	canSubmitContinue: boolean
	canSubmitOpen: boolean
	submitContinueDisabledReason?: string
	submitOpenDisabledReason?: string
}

type SubmitRegistryState = SubmitRegistrySnapshot & {
	activeTargetId: string | null
}

type SubmitRegistryTargetRecord = {
	token: symbol
	target: SubmitTarget
}

type SubmitRegistryStore = {
	subscribe: (listener: () => void) => () => void
	getSnapshot: () => SubmitRegistryState
	registerTarget: (token: symbol, target: SubmitTarget) => void
	clearTargetRegistration: (token: symbol) => void
	submitActiveTarget: (intent?: SubmitIntent) => Promise<boolean>
}

const EMPTY_SUBMIT_REGISTRY_STATE: SubmitRegistryState = {
	activeTargetId: null,
	hasActiveTarget: false,
	canSubmitDefault: false,
	canSubmitContinue: false,
	canSubmitOpen: false,
	submitContinueDisabledReason: '当前没有可提交内容',
	submitOpenDisabledReason: '当前没有可提交内容',
}

const SubmitRegistryStateContext = createContext<SubmitRegistryStore | null>(null)
const SubmitRegistryActionsContext = createContext<SubmitRegistryActions | null>(null)

export function SubmitRegistryProvider({ children }: PropsWithChildren) {
	const storeRef = useRef<SubmitRegistryStore | null>(null)

	if (!storeRef.current) {
		storeRef.current = createSubmitRegistryStore()
	}

	const actions = useMemo<SubmitRegistryActions>(
		() => ({
			registerTarget: (token, target) => {
				storeRef.current?.registerTarget(token, target)
			},
			clearTargetRegistration: (token) => {
				storeRef.current?.clearTargetRegistration(token)
			},
			submitActiveTarget: async (intent = 'default') =>
				(await storeRef.current?.submitActiveTarget(intent)) ?? false,
		}),
		[],
	)

	return (
		<SubmitRegistryActionsContext.Provider value={actions}>
			<SubmitRegistryStateContext.Provider value={storeRef.current}>
				{children}
			</SubmitRegistryStateContext.Provider>
		</SubmitRegistryActionsContext.Provider>
	)
}

export function useSubmitRegistryContext() {
	const store = useContext(SubmitRegistryStateContext)
	const snapshot = useSyncExternalStore(
		store?.subscribe ?? subscribeNoop,
		store?.getSnapshot ?? getEmptySnapshot,
		getEmptySnapshot,
	)

	return {
		activeTarget: snapshot.activeTargetId ? { id: snapshot.activeTargetId } : null,
		hasActiveTarget: snapshot.hasActiveTarget,
		canSubmitIntent: (intent: SubmitIntent) => {
			switch (intent) {
				case 'continue':
					return snapshot.canSubmitContinue
				case 'open':
					return snapshot.canSubmitOpen
				default:
					return snapshot.canSubmitDefault
			}
		},
		getIntentDisabledReason: (intent: SubmitIntent) => {
			switch (intent) {
				case 'continue':
					return snapshot.submitContinueDisabledReason
				case 'open':
					return snapshot.submitOpenDisabledReason
				default:
					return snapshot.canSubmitDefault ? undefined : '当前没有可提交内容'
			}
		},
	}
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

		return () => {
			actions.clearTargetRegistration(token)
		}
	}, [actions])

	useEffect(() => {
		const token = tokenRef.current!

		if (!target) {
			actions.clearTargetRegistration(token)
			return
		}

		actions.registerTarget(token, target)
	}, [actions, target])
}

function createSubmitRegistryStore(): SubmitRegistryStore {
	const listeners = new Set<() => void>()
	const registrations = new Map<symbol, SubmitTarget>()
	let state = EMPTY_SUBMIT_REGISTRY_STATE

	function emitIfChanged(nextState: SubmitRegistryState) {
		if (isSameSubmitRegistryState(state, nextState)) {
			return
		}

		state = nextState
		listeners.forEach((listener) => listener())
	}

	function syncState() {
		const activeRecord = resolveActiveTargetRecord(registrations)
		emitIfChanged(buildSubmitRegistryState(activeRecord))
	}

	return {
		subscribe: (listener) => {
			listeners.add(listener)
			return () => listeners.delete(listener)
		},
		getSnapshot: () => state,
		registerTarget: (token, target) => {
			registrations.set(token, target)
			syncState()
		},
		clearTargetRegistration: (token) => {
			if (!registrations.has(token)) {
				return
			}

			registrations.delete(token)
			syncState()
		},
		submitActiveTarget: async (intent = 'default') => {
			const activeRecord = resolveActiveTargetRecord(registrations)
			emitIfChanged(buildSubmitRegistryState(activeRecord))

			if (!activeRecord) {
				return false
			}

			const disabledReason = resolveTargetIntentDisabledReason(activeRecord.target, intent)
			if (disabledReason) {
				return false
			}

			await activeRecord.target.submit(intent)
			return true
		},
	}
}

function resolveActiveTargetRecord(
	registrations: Map<symbol, SubmitTarget>,
): SubmitRegistryTargetRecord | null {
	const sorted = Array.from(registrations.entries())
		.map(([token, target]) => ({ token, target }))
		.filter((record) => record.target.canSubmit)
		.sort((left, right) => right.target.priority - left.target.priority)

	return sorted[0] ?? null
}

function buildSubmitRegistryState(activeRecord: SubmitRegistryTargetRecord | null): SubmitRegistryState {
	if (!activeRecord) {
		return EMPTY_SUBMIT_REGISTRY_STATE
	}

	const target = activeRecord.target
	return {
		activeTargetId: target.id,
		hasActiveTarget: true,
		canSubmitDefault: resolveTargetIntentDisabledReason(target, 'default') === undefined,
		canSubmitContinue: resolveTargetIntentDisabledReason(target, 'continue') === undefined,
		canSubmitOpen: resolveTargetIntentDisabledReason(target, 'open') === undefined,
		submitContinueDisabledReason: resolveTargetIntentDisabledReason(target, 'continue'),
		submitOpenDisabledReason: resolveTargetIntentDisabledReason(target, 'open'),
	}
}

function resolveTargetIntentDisabledReason(target: SubmitTarget, intent: SubmitIntent) {
	if (!target.canSubmit) {
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

function isSameSubmitRegistryState(left: SubmitRegistryState, right: SubmitRegistryState) {
	return (
		left.activeTargetId === right.activeTargetId &&
		left.hasActiveTarget === right.hasActiveTarget &&
		left.canSubmitDefault === right.canSubmitDefault &&
		left.canSubmitContinue === right.canSubmitContinue &&
		left.canSubmitOpen === right.canSubmitOpen &&
		left.submitContinueDisabledReason === right.submitContinueDisabledReason &&
		left.submitOpenDisabledReason === right.submitOpenDisabledReason
	)
}

function subscribeNoop() {
	return () => {}
}

function getEmptySnapshot() {
	return EMPTY_SUBMIT_REGISTRY_STATE
}
