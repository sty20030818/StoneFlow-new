import {
	createContext,
	startTransition,
	useCallback,
	useContext,
	useDeferredValue,
	useEffect,
	useEffectEvent,
	useMemo,
	useReducer,
	useRef,
	type KeyboardEvent,
	type PropsWithChildren,
	type RefObject,
} from 'react'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { addDays, endOfWeek, format } from 'date-fns'

import {
	create,
	createAndOpen,
	getInitialState,
	listProjectsBySpace,
	openTarget,
	search,
	type QuickCreateInput,
} from '@/features/quick-create/api/quickCreate'
import {
	createQuickCreateInitialState,
	quickCreateReducer,
} from '@/features/quick-create/model/quickCreateReducer'
import type {
	QuickCreateDraft,
	QuickCreatePanelState,
	QuickCreatePlacement,
	QuickCreatePriority,
	QuickCreatePopoverKey,
	QuickCreateProjectItem,
	QuickCreateProjectOption,
	QuickCreateResultItem,
	QuickCreateStatus,
	QuickCreateSubmitAction,
	QuickCreateTaskItem,
} from '@/features/quick-create/model/types'
import { formatTaskPriorityLabel } from '@/features/task/model/taskPriority'
import { formatTaskPlacementLabel } from '@/features/task/model/taskPlacement'

const QUICK_CREATE_SHOWN_EVENT = 'quick-create:shown'
const SEARCH_DEBOUNCE_MS = 120
const PANEL_CLOSE_DELAY_MS = 220

type QuickCreateContextValue = {
	state: QuickCreatePanelState
	derived: {
		hasTitle: boolean
		spaceName: string
		placementLabel: string
		flatItems: QuickCreateResultItem[]
		displayTasks: QuickCreateTaskItem[]
		displayProjects: QuickCreateProjectItem[]
		isShowingRecent: boolean
		isCreateFocused: boolean
		activeResultIndex: number
		projectOptions: QuickCreateProjectOption[]
		createMeta: string
		enterLabel: '创建' | '打开'
		continuousToastVisible: boolean
	}
	refs: {
		titleInputRef: RefObject<HTMLInputElement | null>
		projectSearchRef: RefObject<HTMLInputElement | null>
	}
	actions: {
		setTitle: (title: string) => void
		setPriority: (priority: QuickCreatePriority) => void
		setStatus: (status: QuickCreateStatus) => void
		toggleAdvanced: () => void
		setPopover: (key: QuickCreatePopoverKey | null) => void
		setProjectSearch: (query: string) => void
		selectPlacement: (placement: QuickCreatePlacement) => void
		selectSpace: (spaceId: string) => void
		setDate: (field: 'dueAt' | 'scheduledAt' | 'reminderAt', value: string | null) => void
		moveFocus: (direction: 1 | -1) => void
		focusCreate: () => void
		focusResult: (index: number) => void
		handleEscape: () => void
		handleInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
		submit: (action: Exclude<QuickCreateSubmitAction, 'openResult'>) => Promise<void>
		openResult: (item: QuickCreateResultItem) => Promise<void>
		focusInput: () => void
	}
}

const QuickCreateContext = createContext<QuickCreateContextValue | null>(null)

export function QuickCreateProvider({ children }: PropsWithChildren) {
	const [state, dispatch] = useReducer(quickCreateReducer, undefined, createQuickCreateInitialState)
	const titleInputRef = useRef<HTMLInputElement>(null)
	const projectSearchRef = useRef<HTMLInputElement>(null)
	const closeTimerRef = useRef<number | null>(null)
	const searchRequestIdRef = useRef(0)
	const bootstrapRequestIdRef = useRef(0)
	const deferredTitle = useDeferredValue(state.draft.title)

	const focusInput = useCallback(() => {
		window.requestAnimationFrame(() => {
			window.requestAnimationFrame(() => {
				titleInputRef.current?.focus()
				titleInputRef.current?.setSelectionRange(
					titleInputRef.current.value.length,
					titleInputRef.current.value.length,
				)
			})
		})
	}, [])

	const closeWindow = useCallback(async () => {
		if (closeTimerRef.current !== null) {
			window.clearTimeout(closeTimerRef.current)
			closeTimerRef.current = null
		}

		await getCurrentWindow().hide()
	}, [])

	const scheduleClose = useCallback(() => {
		if (closeTimerRef.current !== null) {
			window.clearTimeout(closeTimerRef.current)
		}

		closeTimerRef.current = window.setTimeout(() => {
			void closeWindow()
		}, PANEL_CLOSE_DELAY_MS)
	}, [closeWindow])

	const loadProjectsForSpace = useCallback(async (spaceId: string) => {
		dispatch({ type: 'projectsLoadingStarted' })

		try {
			const payload = await listProjectsBySpace(spaceId)
			startTransition(() => {
				dispatch({
					type: 'projectsLoadingSucceeded',
					options: [payload.inboxProject, payload.noProjectOption, ...payload.projects],
				})
			})
		} catch (error) {
			dispatch({
				type: 'projectsLoadingFailed',
				message: error instanceof Error ? error.message : '项目列表加载失败',
			})
		}
	}, [])

	const resetPanel = useEffectEvent(async () => {
		const requestId = ++bootstrapRequestIdRef.current
		dispatch({ type: 'bootstrapStarted' })

		try {
			const initialState = await getInitialState()
			if (requestId !== bootstrapRequestIdRef.current) {
				return
			}

			startTransition(() => {
				dispatch({ type: 'bootstrapSucceeded', payload: initialState })
			})
			focusInput()
		} catch (error) {
			dispatch({
				type: 'bootstrapFailed',
				message: error instanceof Error ? error.message : 'Quick Create 初始化失败',
			})
		}
	})

	useEffect(() => {
		void resetPanel()

		let unlisten: (() => void) | undefined
		listen<void>(QUICK_CREATE_SHOWN_EVENT, () => {
			void resetPanel()
		}).then((dispose) => {
			unlisten = dispose
		})

		return () => {
			unlisten?.()
			if (closeTimerRef.current !== null) {
				window.clearTimeout(closeTimerRef.current)
			}
		}
	}, [resetPanel])

	const handleDocumentKeyDown = useEffectEvent((event: globalThis.KeyboardEvent) => {
		if (event.defaultPrevented || event.key !== 'Escape') {
			return
		}

		event.preventDefault()
		handleEscape()
	})

	useEffect(() => {
		document.addEventListener('keydown', handleDocumentKeyDown)
		return () => {
			document.removeEventListener('keydown', handleDocumentKeyDown)
		}
	}, [handleDocumentKeyDown])

	useEffect(() => {
		const query = deferredTitle.trim()
		if (!query) {
			dispatch({ type: 'searchCleared' })
			return
		}

		const requestId = ++searchRequestIdRef.current
		dispatch({ type: 'searchStarted' })

		const timerId = window.setTimeout(() => {
			void search(query, 3)
				.then((payload) => {
					if (requestId !== searchRequestIdRef.current) {
						return
					}

					startTransition(() => {
						dispatch({ type: 'searchSucceeded', payload })
					})
				})
				.catch((error) => {
					if (requestId !== searchRequestIdRef.current) {
						return
					}
					dispatch({
						type: 'searchFailed',
						message: error instanceof Error ? error.message : '搜索失败',
					})
				})
		}, SEARCH_DEBOUNCE_MS)

		return () => {
			window.clearTimeout(timerId)
		}
	}, [deferredTitle])

	useEffect(() => {
		if (state.activePopover === 'project') {
			window.requestAnimationFrame(() => {
				projectSearchRef.current?.focus()
			})
		}
	}, [state.activePopover])

	const setTitle = useCallback((title: string) => {
		dispatch({ type: 'titleChanged', title })
	}, [])

	const setPriority = useCallback((priority: QuickCreatePriority) => {
		dispatch({ type: 'priorityChanged', priority })
		focusInput()
	}, [focusInput])

	const setStatus = useCallback((status: QuickCreateStatus) => {
		dispatch({ type: 'statusChanged', status })
		focusInput()
	}, [focusInput])

	const setPopover = useCallback((key: QuickCreatePopoverKey | null) => {
		dispatch({ type: 'activePopoverChanged', key })
	}, [])

	const selectPlacement = useCallback(
		(placement: QuickCreatePlacement) => {
			dispatch({ type: 'placementChanged', placement })
			dispatch({ type: 'activePopoverClosed' })
			focusInput()
		},
		[focusInput],
	)

	const selectSpace = useCallback(
		(spaceId: string) => {
			dispatch({ type: 'spaceChanged', spaceId })
			dispatch({ type: 'activePopoverClosed' })
			void loadProjectsForSpace(spaceId)
			focusInput()
		},
		[focusInput, loadProjectsForSpace],
	)

	const setDate = useCallback(
		(field: 'dueAt' | 'scheduledAt' | 'reminderAt', value: string | null) => {
			dispatch({ type: 'dateChanged', field, value })
			dispatch({ type: 'activePopoverClosed' })
			focusInput()
		},
		[focusInput],
	)

	const toggleAdvanced = useCallback(() => {
		dispatch({ type: 'advancedToggled' })
		focusInput()
	}, [focusInput])

	const setProjectSearch = useCallback((query: string) => {
		dispatch({ type: 'projectSearchChanged', query })
	}, [])

	const normalizedTitle = state.draft.title.trim()
	const hasTitle = normalizedTitle.length > 0
	const displayTasks = hasTitle ? state.searchResults.tasks : state.initialState?.recentTasks ?? []
	const displayProjects = hasTitle
		? state.searchResults.projects
		: state.initialState?.recentProjects ?? []
	const flatItems = useMemo<QuickCreateResultItem[]>(
		() => [
			...displayTasks.map((item) => ({ kind: 'task' as const, ...item })),
			...displayProjects.map((item) => ({ kind: 'project' as const, ...item })),
		],
		[displayProjects, displayTasks],
	)

	const moveFocus = useCallback(
		(direction: 1 | -1) => {
			if (flatItems.length === 0) {
				return
			}

			const current = state.focusTarget
			if (current === 'create') {
				if (direction === 1) {
					dispatch({ type: 'focusChanged', focusTarget: { kind: 'result', index: 0 } })
				}
				return
			}

			if (current === 'none') {
				dispatch({ type: 'focusChanged', focusTarget: { kind: 'result', index: 0 } })
				return
			}

			const nextIndex = current.index + direction
			if (nextIndex < 0) {
				dispatch({ type: 'focusChanged', focusTarget: hasTitle ? 'create' : 'none' })
				return
			}

			dispatch({
				type: 'focusChanged',
				focusTarget: {
					kind: 'result',
					index: Math.min(nextIndex, flatItems.length - 1),
				},
			})
		},
		[flatItems.length, hasTitle, state.focusTarget],
	)

	const focusCreate = useCallback(() => {
		dispatch({ type: 'focusChanged', focusTarget: hasTitle ? 'create' : 'none' })
		focusInput()
	}, [focusInput, hasTitle])

	const focusResult = useCallback((index: number) => {
		dispatch({ type: 'focusChanged', focusTarget: { kind: 'result', index } })
	}, [])

	const buildCreateInput = useCallback(
		(draft: QuickCreateDraft): QuickCreateInput => ({
			spaceId: draft.spaceId,
			placement: draft.placement,
			title: draft.title.trim(),
			note: null,
			status: draft.status,
			priority: draft.priority,
			dueAt: draft.dueAt,
			scheduledAt: draft.scheduledAt,
			reminderAt: draft.reminderAt,
		}),
		[],
	)

	const openQuickResult = useCallback(
		async (item: QuickCreateResultItem) => {
			dispatch({
				type: 'submitStarted',
				message: item.kind === 'task' ? '正在打开任务...' : '正在打开项目...',
			})

			try {
				await openTarget({
					kind: item.kind,
					id: item.id,
				})
				dispatch({
					type: 'submitCompleted',
					message: item.kind === 'task' ? `已打开任务：${item.title}` : `已打开项目：${item.name}`,
				})
				scheduleClose()
			} catch (error) {
				dispatch({
					type: 'submitFailed',
					message: error instanceof Error ? error.message : '打开失败',
				})
			}
		},
		[scheduleClose],
	)

	const submit = useCallback(
		async (action: Exclude<QuickCreateSubmitAction, 'openResult'>) => {
			if (!hasTitle || state.submitState === 'submitting') {
				if (!hasTitle) {
					dispatch({ type: 'submitFailed', message: '请输入任务标题' })
				}
				return
			}

			const input = buildCreateInput(state.draft)
			const submittingMessage =
				action === 'createAndOpen'
					? '正在创建并打开任务...'
					: action === 'createAndContinue'
						? '正在创建任务...'
						: '正在创建任务...'

			dispatch({ type: 'submitStarted', message: submittingMessage })

			try {
				if (action === 'createAndOpen') {
					await createAndOpen(input)
					dispatch({ type: 'submitCompleted', message: `已创建并打开「${input.title}」` })
					scheduleClose()
					return
				}

				await create(input)
				if (action === 'createAndContinue') {
					dispatch({
						type: 'continuousCreateSucceeded',
						message: `已连续创建 ${state.continuousCreateCount + 1} 条`,
					})
					focusInput()
					return
				}

				dispatch({ type: 'submitCompleted', message: `已创建「${input.title}」` })
				scheduleClose()
			} catch (error) {
				dispatch({
					type: 'submitFailed',
					message: error instanceof Error ? error.message : '创建失败',
				})
			}
		},
		[buildCreateInput, focusInput, hasTitle, scheduleClose, state.continuousCreateCount, state.draft, state.submitState],
	)

	const handleEscape = useCallback(() => {
		if (state.activePopover) {
			dispatch({ type: 'activePopoverClosed' })
			focusInput()
			return
		}

		if (state.draft.title.trim()) {
			dispatch({ type: 'titleCleared' })
			focusInput()
			return
		}

		void closeWindow()
	}, [closeWindow, focusInput, state.activePopover, state.draft.title])

	const handleInputKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (event.key === 'Escape') {
				event.preventDefault()
				handleEscape()
				return
			}

			if (event.key === 'ArrowDown') {
				event.preventDefault()
				moveFocus(1)
				return
			}

			if (event.key === 'ArrowUp') {
				event.preventDefault()
				moveFocus(-1)
				return
			}

			if (event.key !== 'Enter') {
				return
			}

			event.preventDefault()
			const currentFocus = state.focusTarget

			if ((event.metaKey || event.ctrlKey) && hasTitle) {
				void submit('createAndOpen')
				return
			}

			if (event.shiftKey && hasTitle) {
				void submit('createAndContinue')
				return
			}

			if (currentFocus !== 'none' && currentFocus !== 'create') {
				const item = flatItems[currentFocus.index]
				if (item) {
					void openQuickResult(item)
					return
				}
			}

			if (hasTitle) {
				void submit('create')
			}
		},
		[flatItems, handleEscape, hasTitle, moveFocus, openQuickResult, state.focusTarget, submit],
	)

	const currentSpace = state.initialState?.spaces.find((space) => space.id === state.draft.spaceId) ?? null
	const projectOptions = useMemo(() => {
		if (!state.projectSearch.trim()) {
			return state.projectOptions
		}

		const normalizedQuery = state.projectSearch.trim().toLowerCase()
		return state.projectOptions.filter((option) => {
			if (option.kind !== 'project') {
				return true
			}
			return option.name.toLowerCase().includes(normalizedQuery)
		})
	}, [state.projectOptions, state.projectSearch])

	const placementLabel = useMemo(() => {
		if (state.draft.placement.kind === 'project') {
			return (
				state.projectOptions.find(
					(option) => option.kind === 'project' && option.id === state.draft.placement.projectId,
				)?.name ?? '指定项目'
			)
		}

		return formatTaskPlacementLabel(state.draft.placement.kind)
	}, [state.draft.placement, state.projectOptions])

	const createMeta = useMemo(() => {
		const parts = [
			formatTaskPriorityLabel(state.draft.priority),
			formatStatusLabel(state.draft.status),
			currentSpace ? `${currentSpace.name} / ${placementLabel}` : placementLabel,
		]

		if (state.draft.dueAt) {
			parts.push(`截止 ${formatDateLabel(state.draft.dueAt)}`)
		}
		if (state.draft.scheduledAt) {
			parts.push(`计划 ${formatDateLabel(state.draft.scheduledAt)}`)
		}
		if (state.draft.reminderAt) {
			parts.push(`提醒 ${formatDateLabel(state.draft.reminderAt)}`)
		}

		return parts.join(' · ')
	}, [
		currentSpace,
		placementLabel,
		state.draft.dueAt,
		state.draft.priority,
		state.draft.reminderAt,
		state.draft.scheduledAt,
		state.draft.status,
	])

	const value = useMemo<QuickCreateContextValue>(
		() => ({
			state,
			derived: {
				hasTitle,
				spaceName: currentSpace?.name ?? '加载中...',
				placementLabel,
				flatItems,
				displayTasks,
				displayProjects,
				isShowingRecent: !hasTitle,
				isCreateFocused: state.focusTarget === 'create',
				activeResultIndex:
					state.focusTarget !== 'none' && state.focusTarget !== 'create'
						? state.focusTarget.index
						: -1,
				projectOptions,
				createMeta,
				enterLabel:
					state.focusTarget !== 'none' && state.focusTarget !== 'create' ? '打开' : '创建',
				continuousToastVisible: state.continuousCreateCount > 0 && !hasTitle,
			},
			refs: {
				titleInputRef,
				projectSearchRef,
			},
			actions: {
				setTitle,
				setPriority,
				setStatus,
				toggleAdvanced,
				setPopover,
				setProjectSearch,
				selectPlacement,
				selectSpace,
				setDate,
				moveFocus,
				focusCreate,
				focusResult,
				handleEscape,
				handleInputKeyDown,
				submit,
				openResult: openQuickResult,
				focusInput,
			},
		}),
		[
			createMeta,
			currentSpace?.name,
			displayProjects,
			displayTasks,
			flatItems,
			focusCreate,
			focusInput,
			focusResult,
			handleEscape,
			handleInputKeyDown,
			hasTitle,
			moveFocus,
			openQuickResult,
			placementLabel,
			projectOptions,
			selectPlacement,
			selectSpace,
			setDate,
			setPopover,
			setPriority,
			setProjectSearch,
			setStatus,
			setTitle,
			state,
			submit,
			toggleAdvanced,
		],
	)

	return <QuickCreateContext.Provider value={value}>{children}</QuickCreateContext.Provider>
}

export function useQuickCreate() {
	const context = useContext(QuickCreateContext)
	if (!context) {
		throw new Error('useQuickCreate 必须在 QuickCreateProvider 内使用')
	}
	return context
}

export function getQuickDatePreset(
	preset: 'today' | 'tomorrow' | 'week',
	referenceDate = new Date(),
) {
	if (preset === 'today') {
		return formatDateValue(referenceDate)
	}

	if (preset === 'tomorrow') {
		return formatDateValue(addDays(referenceDate, 1))
	}

	return formatDateValue(endOfWeek(referenceDate, { weekStartsOn: 1 }))
}

export function formatDateValue(date: Date) {
	return format(date, 'yyyy-MM-dd')
}

export function formatDateLabel(value: string) {
	try {
		const [year, month, day] = value.split('-').map(Number)
		if (!year || !month || !day) {
			return value
		}

		return format(new Date(year, month - 1, day), 'M/d')
	} catch {
		return value
	}
}

export function formatStatusLabel(status: QuickCreateStatus) {
	switch (status) {
		case 'doing':
			return '进行中'
		case 'done':
			return '已完成'
		default:
			return '待执行'
	}
}
