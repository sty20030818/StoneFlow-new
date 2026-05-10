import type {
	QuickCreateDraft,
	QuickCreateFocusTarget,
	QuickCreateInitialState,
	QuickCreatePanelState,
	QuickCreatePlacement,
	QuickCreatePriority,
	QuickCreatePopoverKey,
	QuickCreateProjectOption,
	QuickCreateSearchResponse,
	QuickCreateStatus,
} from './types'

const defaultDraft: QuickCreateDraft = {
	title: '',
	priority: 0,
	status: 'todo',
	spaceId: null,
	placement: { kind: 'inbox', projectId: null },
	dueAt: null,
	scheduledAt: null,
	reminderAt: null,
}

export function createQuickCreateInitialState(): QuickCreatePanelState {
	return {
		isBootstrapping: true,
		initialState: null,
		draft: defaultDraft,
		projectOptions: [],
		projectSearch: '',
		isProjectOptionsLoading: false,
		activePopover: null,
		isAdvancedOpen: false,
		searchResults: { tasks: [], projects: [] },
		isSearching: false,
		focusTarget: 'none',
		submitState: 'idle',
		message: '输入标题创建，或打开最近任务、项目',
		continuousCreateCount: 0,
		errorMessage: null,
	}
}

type QuickCreateAction =
	| { type: 'bootstrapStarted' }
	| { type: 'bootstrapSucceeded'; payload: QuickCreateInitialState }
	| { type: 'bootstrapFailed'; message: string }
	| { type: 'titleChanged'; title: string }
	| { type: 'priorityChanged'; priority: QuickCreatePriority }
	| { type: 'statusChanged'; status: QuickCreateStatus }
	| { type: 'spaceChanged'; spaceId: string }
	| { type: 'placementChanged'; placement: QuickCreatePlacement }
	| { type: 'dateChanged'; field: 'dueAt' | 'scheduledAt' | 'reminderAt'; value: string | null }
	| { type: 'advancedToggled' }
	| { type: 'activePopoverChanged'; key: QuickCreatePopoverKey | null }
	| { type: 'projectSearchChanged'; query: string }
	| { type: 'projectsLoadingStarted' }
	| { type: 'projectsLoadingSucceeded'; options: QuickCreateProjectOption[] }
	| { type: 'projectsLoadingFailed'; message: string }
	| { type: 'searchStarted' }
	| { type: 'searchSucceeded'; payload: QuickCreateSearchResponse }
	| { type: 'searchCleared' }
	| { type: 'searchFailed'; message: string }
	| { type: 'focusChanged'; focusTarget: QuickCreateFocusTarget }
	| { type: 'submitStarted'; message: string }
	| { type: 'submitFailed'; message: string }
	| { type: 'submitCompleted'; message: string }
	| { type: 'continuousCreateSucceeded'; message: string }
	| { type: 'titleCleared' }
	| { type: 'activePopoverClosed' }

export function quickCreateReducer(
	state: QuickCreatePanelState,
	action: QuickCreateAction,
): QuickCreatePanelState {
	switch (action.type) {
		case 'bootstrapStarted':
			return {
				...createQuickCreateInitialState(),
				isBootstrapping: true,
			}
		case 'bootstrapSucceeded':
			return {
				...state,
				isBootstrapping: false,
				initialState: action.payload,
				draft: {
					...state.draft,
					title: '',
					priority: 0,
					status: 'todo',
					spaceId: action.payload.defaultSpaceId,
					placement: action.payload.defaultPlacement,
					dueAt: null,
					scheduledAt: null,
					reminderAt: null,
				},
				projectOptions: action.payload.projects,
				projectSearch: '',
				isProjectOptionsLoading: false,
				activePopover: null,
				isAdvancedOpen: false,
				searchResults: { tasks: [], projects: [] },
				isSearching: false,
				focusTarget: 'none',
				submitState: 'idle',
				message: '输入标题创建，或打开最近任务、项目',
				continuousCreateCount: 0,
				errorMessage: null,
			}
		case 'bootstrapFailed':
			return {
				...state,
				isBootstrapping: false,
				submitState: 'error',
				message: action.message,
				errorMessage: action.message,
			}
		case 'titleChanged': {
			const hasTitle = action.title.trim().length > 0
			return {
				...state,
				draft: { ...state.draft, title: action.title },
				focusTarget: hasTitle ? 'create' : 'none',
				submitState: state.submitState === 'error' ? 'idle' : state.submitState,
				errorMessage: state.submitState === 'error' ? null : state.errorMessage,
				message:
					state.submitState === 'error'
						? '输入标题创建，或打开最近任务、项目'
						: state.message,
			}
		}
		case 'priorityChanged':
			return {
				...state,
				draft: { ...state.draft, priority: action.priority },
			}
		case 'statusChanged':
			return {
				...state,
				draft: { ...state.draft, status: action.status },
			}
		case 'spaceChanged':
			return {
				...state,
				draft: {
					...state.draft,
					spaceId: action.spaceId,
					placement: { kind: 'inbox', projectId: null },
				},
				projectSearch: '',
				isProjectOptionsLoading: true,
			}
		case 'placementChanged':
			return {
				...state,
				draft: { ...state.draft, placement: action.placement },
				projectSearch: '',
			}
		case 'dateChanged':
			return {
				...state,
				draft: {
					...state.draft,
					[action.field]: action.value,
				},
			}
		case 'advancedToggled':
			return {
				...state,
				isAdvancedOpen: !state.isAdvancedOpen,
			}
		case 'activePopoverChanged':
			return {
				...state,
				activePopover: action.key,
			}
		case 'activePopoverClosed':
			return {
				...state,
				activePopover: null,
				projectSearch: '',
			}
		case 'projectSearchChanged':
			return {
				...state,
				projectSearch: action.query,
			}
		case 'projectsLoadingStarted':
			return {
				...state,
				isProjectOptionsLoading: true,
			}
		case 'projectsLoadingSucceeded':
			return {
				...state,
				projectOptions: action.options,
				isProjectOptionsLoading: false,
			}
		case 'projectsLoadingFailed':
			return {
				...state,
				isProjectOptionsLoading: false,
				submitState: 'error',
				message: action.message,
				errorMessage: action.message,
			}
		case 'searchStarted':
			return {
				...state,
				isSearching: true,
			}
		case 'searchSucceeded':
			return {
				...state,
				isSearching: false,
				searchResults: action.payload,
			}
		case 'searchCleared':
			return {
				...state,
				isSearching: false,
				searchResults: { tasks: [], projects: [] },
			}
		case 'searchFailed':
			return {
				...state,
				isSearching: false,
				searchResults: { tasks: [], projects: [] },
				submitState: 'error',
				message: action.message,
				errorMessage: action.message,
			}
		case 'focusChanged':
			return {
				...state,
				focusTarget: action.focusTarget,
			}
		case 'submitStarted':
			return {
				...state,
				submitState: 'submitting',
				message: action.message,
				errorMessage: null,
			}
		case 'submitFailed':
			return {
				...state,
				submitState: 'error',
				message: action.message,
				errorMessage: action.message,
			}
		case 'submitCompleted':
			return {
				...state,
				submitState: 'success',
				message: action.message,
				errorMessage: null,
			}
		case 'continuousCreateSucceeded':
			return {
				...state,
				draft: {
					...state.draft,
					title: '',
				},
				searchResults: { tasks: [], projects: [] },
				isSearching: false,
				focusTarget: 'none',
				submitState: 'success',
				message: action.message,
				errorMessage: null,
				continuousCreateCount: state.continuousCreateCount + 1,
			}
		case 'titleCleared':
			return {
				...state,
				draft: {
					...state.draft,
					title: '',
				},
				searchResults: { tasks: [], projects: [] },
				isSearching: false,
				focusTarget: 'none',
				submitState: 'idle',
				message: '输入标题创建，或打开最近任务、项目',
				errorMessage: null,
			}
		default:
			return state
	}
}

export type { QuickCreateAction }
