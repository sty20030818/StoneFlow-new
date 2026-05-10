import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	type ReactNode,
} from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
	AlertTriangleIcon,
	CheckCircle2Icon,
	CircleIcon,
	FolderIcon,
	LoaderCircleIcon,
	SearchIcon,
} from 'lucide-react'

import { Button } from '@/shared/ui/base/button'
import { Kbd } from '@/shared/ui/base/kbd'
import { cn } from '@/shared/lib/utils'
import {
	quickCaptureMetaPillClass,
	quickCaptureSearchInputShellClass,
	quickCaptureStatePanelClass,
	quickCaptureSurfaceClass,
	quickCaptureTypePillClass,
} from '@/shared/ui/patterns/quick-capture'

type CommandMode = 'idle' | 'search' | 'create'
type CommandPriority = 'P0' | 'P1' | 'P2' | 'P3'
type CommandStatus = 'idle' | 'submitting' | 'success' | 'error'
type CommandResultItem =
	| ({ kind: 'task' } & HelperQuickTaskItem)
	| ({ kind: 'project' } & HelperQuickProjectItem)

type QuickCreateSurfaceProps = {
	closeWindow?: () => Promise<void> | void
	closeDelayMs?: number
}

type HelperQuickScope = {
	type: 'all' | 'space'
	spaceId: string | null
}

type HelperQuickPlacement = {
	kind: 'inbox' | 'noProject' | 'project'
	projectId: string | null
}

type HelperQuickSpaceSummary = {
	id: string
	name: string
	isDefault: boolean
}

type HelperQuickProjectOption = {
	kind: 'inbox' | 'noProject' | 'project'
	id: string | null
	spaceId: string
	name: string
}

type HelperQuickTaskItem = {
	id: string
	spaceId: string
	spaceName: string
	projectId: string | null
	projectName: string | null
	inboxAt: string | null
	title: string
	note: string | null
	priority: number
	status: string
	updatedAt: string
	completedAt: string | null
}

type HelperQuickProjectItem = {
	id: string
	spaceId: string
	spaceName: string
	name: string
	note: string | null
	updatedAt: string
	completedAt: string | null
}

type HelperQuickInitialState = {
	currentScope: HelperQuickScope
	defaultSpaceId: string
	defaultPlacement: HelperQuickPlacement
	spaces: HelperQuickSpaceSummary[]
	projects: HelperQuickProjectOption[]
	recentTasks: HelperQuickTaskItem[]
	recentProjects: HelperQuickProjectItem[]
}

type HelperQuickSearchResponse = {
	tasks: HelperQuickTaskItem[]
	projects: HelperQuickProjectItem[]
}

const DEFAULT_CLOSE_DELAY_MS = 900
const PRIORITIES: CommandPriority[] = ['P0', 'P1', 'P2', 'P3']
const PRIORITY_TO_LABEL: Record<CommandPriority, string> = {
	P0: '紧急',
	P1: '高',
	P2: '中',
	P3: '低',
}
const PRIORITY_TO_VALUE: Record<CommandPriority, number> = {
	P0: 4,
	P1: 3,
	P2: 2,
	P3: 1,
}
const PRIORITY_CLASS: Record<CommandPriority, string> = {
	P0: 'border-sf-danger-surface-border bg-sf-danger-surface text-sf-danger-surface-text',
	P1: 'border-sf-warning-surface-border bg-sf-warning-surface text-sf-warning-surface-text',
	P2: 'border-sf-border-subtle bg-accent text-accent-foreground',
	P3: 'border-sf-border-subtle bg-muted text-sf-text-secondary',
}

function closeCurrentWindow() {
	return getCurrentWindow().hide()
}

export function QuickCreatePage() {
	useEffect(() => {
		document.body.dataset.quickCreate = 'true'
		return () => {
			delete document.body.dataset.quickCreate
		}
	}, [])

	return (
		<div className='flex h-full min-h-0 items-stretch bg-transparent p-0.75'>
			<QuickCreateSurface />
		</div>
	)
}

export function QuickCreateSurface({
	closeWindow = closeCurrentWindow,
	closeDelayMs = DEFAULT_CLOSE_DELAY_MS,
}: QuickCreateSurfaceProps) {
	const inputRef = useRef<HTMLInputElement>(null)
	const closeTimerRef = useRef<number | null>(null)
	const [query, setQuery] = useState('')
	const [priority, setPriority] = useState<CommandPriority>('P1')
	const [highlightedIndex, setHighlightedIndex] = useState(0)
	const [isLoading, setIsLoading] = useState(false)
	const [status, setStatus] = useState<CommandStatus>('idle')
	const [message, setMessage] = useState('输入标题创建，或搜索已有任务与项目')
	const [initialState, setInitialState] = useState<HelperQuickInitialState | null>(null)
	const [searchResults, setSearchResults] = useState<HelperQuickSearchResponse>({
		tasks: [],
		projects: [],
	})
	const normalizedQuery = query.trim()
	const hasResults = searchResults.tasks.length > 0 || searchResults.projects.length > 0
	const mode: CommandMode = !normalizedQuery
		? 'idle'
		: hasResults || isLoading
			? 'search'
			: 'create'
	const flatItems = useMemo<CommandResultItem[]>(
		() => [
			...searchResults.tasks.map((item) => ({ kind: 'task' as const, ...item })),
			...searchResults.projects.map((item) => ({ kind: 'project' as const, ...item })),
		],
		[searchResults.projects, searchResults.tasks],
	)

	const focusInput = useCallback(() => {
		window.requestAnimationFrame(() => {
			window.requestAnimationFrame(() => {
				inputRef.current?.focus()
				inputRef.current?.select()
			})
		})
	}, [])

	const requestClose = useCallback(() => {
		if (closeTimerRef.current !== null) {
			window.clearTimeout(closeTimerRef.current)
			closeTimerRef.current = null
		}

		void closeWindow()
	}, [closeWindow])

	const loadInitialState = useCallback(async () => {
		const payload = await invoke<HelperQuickInitialState>('helper_quick_get_initial_state')
		setInitialState(payload)
	}, [])

	const resetPanel = useCallback(() => {
		setQuery('')
		setPriority('P1')
		setHighlightedIndex(0)
		setIsLoading(false)
		setSearchResults({ tasks: [], projects: [] })
		setStatus('idle')
		setMessage('输入标题创建，或搜索已有任务与项目')
		void loadInitialState().finally(() => {
			focusInput()
		})
	}, [focusInput, loadInitialState])

	useEffect(() => {
		resetPanel()

		let unlistenTauri: (() => void) | undefined
		listen<void>('quick-create:shown', resetPanel).then((fn) => {
			unlistenTauri = fn
		})

		window.addEventListener('focus', resetPanel)

		return () => {
			unlistenTauri?.()
			window.removeEventListener('focus', resetPanel)
			if (closeTimerRef.current !== null) {
				window.clearTimeout(closeTimerRef.current)
			}
		}
	}, [resetPanel])

	useEffect(() => {
		const onDocKeyDown = (event: globalThis.KeyboardEvent) => {
			if (event.key !== 'Escape') return
			event.preventDefault()
			requestClose()
		}
		document.addEventListener('keydown', onDocKeyDown)
		return () => document.removeEventListener('keydown', onDocKeyDown)
	}, [requestClose])

	useEffect(() => {
		if (!normalizedQuery) {
			setSearchResults({ tasks: [], projects: [] })
			setIsLoading(false)
			setHighlightedIndex(0)
			return
		}

		let cancelled = false
		setIsLoading(true)

		const timerId = window.setTimeout(() => {
			void invoke<HelperQuickSearchResponse>('helper_quick_search', {
				input: {
					query: normalizedQuery,
					limit: 5,
				},
			})
				.then((payload) => {
					if (cancelled) {
						return
					}
					setSearchResults(payload)
					setHighlightedIndex(0)
					setStatus('idle')
					setMessage('输入标题创建，或搜索已有任务与项目')
				})
				.catch((error) => {
					if (cancelled) {
						return
					}
					console.error('helper quick search failed', { error })
					setSearchResults({ tasks: [], projects: [] })
					setStatus('error')
					setMessage(error instanceof Error ? error.message : '搜索失败')
				})
				.finally(() => {
					if (!cancelled) {
						setIsLoading(false)
					}
				})
		}, 120)

		return () => {
			cancelled = true
			window.clearTimeout(timerId)
		}
	}, [normalizedQuery])

	const cyclePriority = useCallback(() => {
		setPriority((current) => {
			const currentIndex = PRIORITIES.indexOf(current)
			return PRIORITIES[(currentIndex + 1) % PRIORITIES.length]
		})
	}, [])

	const moveHighlight = useCallback(
		(direction: 1 | -1) => {
			if (flatItems.length === 0) return
			setHighlightedIndex((currentIndex) => {
				const nextIndex = currentIndex + direction
				if (nextIndex < 0) return flatItems.length - 1
				if (nextIndex >= flatItems.length) return 0
				return nextIndex
			})
		},
		[flatItems.length],
	)

	const buildCreateInput = useCallback(() => {
		if (!initialState) {
			throw new Error('Quick Create 初始态尚未就绪')
		}

		return {
			spaceId: initialState.defaultSpaceId,
			placement: initialState.defaultPlacement,
			title: normalizedQuery,
			note: null,
			status: 'todo',
			priority: PRIORITY_TO_VALUE[priority],
			dueAt: null,
			scheduledAt: null,
			reminderAt: null,
		}
	}, [initialState, normalizedQuery, priority])

	const submitCreate = useCallback(
		async (andOpen: boolean) => {
			if (status === 'submitting') return
			if (!normalizedQuery) {
				setStatus('error')
				setMessage('请输入任务标题')
				focusInput()
				return
			}

			setStatus('submitting')
			setMessage(andOpen ? '正在创建并打开任务...' : '正在创建任务...')

			try {
				const input = buildCreateInput()
				await invoke(andOpen ? 'helper_quick_create_and_open' : 'helper_quick_create', {
					input,
				})
				setStatus('success')
				setMessage(
					andOpen
						? `已创建并打开「${normalizedQuery}」`
						: `已创建「${normalizedQuery}」 · ${PRIORITY_TO_LABEL[priority]}`,
				)
				setQuery('')
				closeTimerRef.current = window.setTimeout(requestClose, closeDelayMs)
			} catch (error) {
				setStatus('error')
				setMessage(error instanceof Error ? error.message : '创建失败')
			}
		},
		[buildCreateInput, closeDelayMs, focusInput, normalizedQuery, priority, requestClose, status],
	)

	const openResult = useCallback(
		async (item: CommandResultItem) => {
			setStatus('submitting')
			setMessage(item.kind === 'task' ? '正在打开任务...' : '正在打开项目...')

			try {
				await invoke('helper_quick_open_target', {
					input: {
						kind: item.kind,
						id: item.id,
					},
				})
				setStatus('success')
				setMessage(item.kind === 'task' ? `已打开任务：${item.title}` : `已打开项目：${item.name}`)
				requestClose()
			} catch (error) {
				setStatus('error')
				setMessage(error instanceof Error ? error.message : '打开失败')
			}
		},
		[requestClose],
	)

	const executePrimaryAction = useCallback(
		(andOpen = false) => {
			if (mode === 'search') {
				const activeItem = flatItems[highlightedIndex]
				if (activeItem) {
					void openResult(activeItem)
				}
				return
			}

			if (mode === 'create') {
				void submitCreate(andOpen)
			}
		},
		[flatItems, highlightedIndex, mode, openResult, submitCreate],
	)

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault()
			executePrimaryAction(event.metaKey || event.ctrlKey)
			return
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault()
			moveHighlight(1)
			return
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault()
			moveHighlight(-1)
			return
		}

		if (event.key === 'Tab' && mode === 'create') {
			event.preventDefault()
			cyclePriority()
		}
	}

	const handleSurfacePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
		const target = event.target as HTMLElement | null
		if (!target) return
		if (target.closest('button, input, textarea, select, [contenteditable="true"]')) {
			return
		}
		event.preventDefault()
		inputRef.current?.focus()
	}, [])

	const spaceLabel =
		initialState?.spaces.find((space) => space.id === initialState.defaultSpaceId)?.name ?? '加载中...'
	const placementLabel = formatPlacementLabel(initialState)

	return (
		<section
			aria-label='StoneFlow Quick Create'
			className={quickCaptureSurfaceClass}
			onPointerDown={handleSurfacePointerDown}
		>
			<div className='flex items-center gap-2 border-b border-sf-divider px-4 py-3'>
				<div className={quickCaptureSearchInputShellClass}>
					<SearchIcon className='size-3.5 shrink-0 text-sf-icon-subtle' />
					<input
						ref={inputRef}
						aria-label='Quick Create 输入'
						autoComplete='off'
						className='min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-sf-text-quaternary'
						disabled={status === 'submitting'}
						onChange={(event) => {
							setQuery(event.target.value)
							if (status === 'error') {
								setStatus('idle')
								setMessage('输入标题创建，或搜索已有任务与项目')
							}
						}}
						onKeyDown={handleKeyDown}
						placeholder='输入任务标题，或搜索已有任务、项目...'
						spellCheck={false}
						value={query}
					/>
				</div>

				<Button
					className={cn(
						'h-9 min-w-22 rounded-md px-3 text-[12px]',
						mode === 'create'
							? 'bg-primary text-primary-foreground hover:opacity-95'
							: 'border border-border bg-card text-sf-text-secondary hover:border-sf-border-subtle hover:bg-accent hover:text-accent-foreground',
					)}
					disabled={status === 'submitting' || mode === 'idle'}
					onClick={() => executePrimaryAction(false)}
					variant={mode === 'create' ? 'default' : 'ghost'}
				>
					{status === 'submitting' ? '处理中...' : mode === 'create' ? '创建任务' : '打开'}
				</Button>
			</div>

			{mode === 'create' ? (
				<div className='flex h-11 items-center gap-2 overflow-hidden border-b border-sf-divider bg-muted/45 px-4'>
					<span className='shrink-0 text-[11.5px] text-sf-text-quaternary'>优先级</span>
					{PRIORITIES.map((item) => (
						<button
							key={item}
							className={cn(
								'h-6 rounded-md border px-2.5 font-mono text-[11.5px] font-semibold transition-opacity',
								PRIORITY_CLASS[item],
								item === priority ? 'opacity-100 ring-2 ring-ring/14 ring-offset-1' : 'opacity-45',
							)}
							onClick={() => setPriority(item)}
							type='button'
						>
							{item}
						</button>
					))}
					<div className='mx-1 h-4 w-px bg-sf-divider' />
					<span className='shrink-0 text-[11.5px] text-sf-text-quaternary'>所属空间</span>
					<span className={quickCaptureMetaPillClass}>{spaceLabel}</span>
					<div className='mx-1 h-4 w-px bg-sf-divider' />
					<span className='shrink-0 text-[11.5px] text-sf-text-quaternary'>所属项目</span>
					<span className={quickCaptureMetaPillClass}>{placementLabel}</span>
				</div>
			) : null}

			<div className='min-h-0 flex-1 overflow-y-auto'>
				{mode === 'idle' ? (
					<CommandPanelState label='输入关键词搜索任务 / 项目；无匹配时直接创建任务。' />
				) : isLoading && !hasResults ? (
					<CommandPanelState label='正在搜索当前 Scope...' loading />
				) : mode === 'create' ? (
					<CommandPanelState label={`没有匹配结果，按 Enter 创建“${normalizedQuery}”。`} />
				) : (
					<CommandResults
						highlightedIndex={highlightedIndex}
						projectItems={searchResults.projects}
						taskItems={searchResults.tasks}
						onHighlightIndex={setHighlightedIndex}
						onOpenResult={(item) => void openResult(item)}
					/>
				)}
			</div>

			<div className='flex min-h-10 items-center gap-3 border-t border-sf-divider bg-muted/70 px-4 text-[11px] text-sf-text-quaternary'>
				<StatusMessage message={message} status={status} />
				<div className='ml-auto flex items-center gap-3'>
					<Hint keys='↑↓' label='选择' />
					<Hint keys='↵' label={mode === 'create' ? '创建' : '打开'} />
					{mode === 'create' ? <Hint keys='⌘/Ctrl+↵' label='创建并打开' /> : null}
					{mode === 'create' ? <Hint keys='Tab' label='切优先级' /> : null}
					<Hint keys='Esc' label='关闭' />
				</div>
			</div>
		</section>
	)
}

function formatPlacementLabel(initialState: HelperQuickInitialState | null) {
	if (!initialState) {
		return '加载中...'
	}

	const placement = initialState.defaultPlacement
	if (placement.kind === 'inbox') {
		return 'Inbox'
	}
	if (placement.kind === 'noProject') {
		return '独立事项'
	}

	return (
		initialState.projects.find((project) => project.id === placement.projectId)?.name ?? '指定项目'
	)
}

function CommandResults({
	taskItems,
	projectItems,
	highlightedIndex,
	onHighlightIndex,
	onOpenResult,
}: {
	taskItems: HelperQuickTaskItem[]
	projectItems: HelperQuickProjectItem[]
	highlightedIndex: number
	onHighlightIndex: (index: number) => void
	onOpenResult: (item: CommandResultItem) => void
}) {
	return (
		<div className='py-2'>
			{taskItems.length > 0 ? (
				<CommandResultSection title='任务'>
					{taskItems.map((item, index) => (
						<CommandResultRow
							isActive={highlightedIndex === index}
							item={{ kind: 'task', ...item }}
							key={item.id}
							onHighlight={() => onHighlightIndex(index)}
							onOpen={() => onOpenResult({ kind: 'task', ...item })}
						/>
					))}
				</CommandResultSection>
			) : null}

			{projectItems.length > 0 ? (
				<CommandResultSection title='项目'>
					{projectItems.map((item, index) => {
						const flatIndex = taskItems.length + index
						return (
							<CommandResultRow
								isActive={highlightedIndex === flatIndex}
								item={{ kind: 'project', ...item }}
								key={item.id}
								onHighlight={() => onHighlightIndex(flatIndex)}
								onOpen={() => onOpenResult({ kind: 'project', ...item })}
							/>
						)
					})}
				</CommandResultSection>
			) : null}
		</div>
	)
}

function CommandResultSection({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className='border-b border-sf-divider last:border-b-0'>
			<div className='px-4 pb-1 pt-2 text-[10.5px] font-medium tracking-[0.06em] text-sf-text-quaternary uppercase'>
				{title}
			</div>
			<div>{children}</div>
		</section>
	)
}

function CommandResultRow({
	item,
	isActive,
	onHighlight,
	onOpen,
}: {
	item: CommandResultItem
	isActive: boolean
	onHighlight: () => void
	onOpen: () => void
}) {
	const isTask = item.kind === 'task'
	const title = isTask ? item.title : item.name
	const subtitle = isTask
		? `${item.spaceName} / ${item.projectName ?? (item.inboxAt ? 'Inbox' : '独立事项')}`
		: item.spaceName

	return (
		<button
			className={cn(
				'relative flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors',
				isActive ? 'bg-accent' : 'hover:bg-sf-surface-hover',
			)}
			onClick={onOpen}
			onMouseEnter={onHighlight}
			type='button'
		>
			{isActive ? <span className='absolute inset-y-0 left-0 w-0.75 rounded-r-sm bg-primary' /> : null}
			<span
				className={cn(
					'flex size-6 shrink-0 items-center justify-center rounded-md',
					isActive
						? isTask
							? 'bg-accent text-accent-foreground'
							: 'bg-sf-success-surface text-sf-success-surface-text'
						: 'bg-muted/70 text-sf-text-secondary',
				)}
			>
				{isTask ? <CircleIcon className='size-3' /> : <FolderIcon className='size-3.5' />}
			</span>
			<span className='min-w-0 flex-1'>
				<span className='block truncate text-[13px] text-foreground'>{title}</span>
				<span className='mt-0.5 block truncate text-[11.5px] text-sf-text-quaternary'>
					{subtitle}
				</span>
			</span>
			{isTask && item.priority > 0 ? <PriorityBadge priority={item.priority} /> : null}
			<span className={quickCaptureTypePillClass}>{isTask ? '任务' : '项目'}</span>
		</button>
	)
}

function PriorityBadge({ priority }: { priority: number }) {
	const label = priorityToLabel(priority)
	const className =
		label === 'P0'
			? PRIORITY_CLASS.P0
			: label === 'P1'
				? PRIORITY_CLASS.P1
				: label === 'P2'
					? PRIORITY_CLASS.P2
					: PRIORITY_CLASS.P3

	return (
		<span className={cn('rounded-md border px-1.5 py-0.5 font-mono text-[10.5px]', className)}>
			{label}
		</span>
	)
}

function CommandPanelState({ label, loading = false }: { label: string; loading?: boolean }) {
	return (
		<div className='flex h-full min-h-44 items-center justify-center px-5'>
			<div className={quickCaptureStatePanelClass}>
				{loading ? (
					<LoaderCircleIcon className='size-4 animate-spin' />
				) : (
					<SearchIcon className='size-4' />
				)}
				<span>{label}</span>
			</div>
		</div>
	)
}

function StatusMessage({ status, message }: { status: CommandStatus; message: string }) {
	return (
		<div
			aria-live='polite'
			className={cn(
				'flex min-w-0 items-center gap-1.5',
				status === 'error'
					? 'text-sf-danger-surface-text'
					: status === 'success'
						? 'text-sf-success-surface-text'
						: 'text-sf-text-quaternary',
			)}
		>
			{status === 'error' ? <AlertTriangleIcon className='size-3.5 shrink-0' /> : null}
			{status === 'success' ? <CheckCircle2Icon className='size-3.5 shrink-0' /> : null}
			{status === 'submitting' ? <LoaderCircleIcon className='size-3.5 shrink-0 animate-spin' /> : null}
			<span className='truncate'>{message}</span>
		</div>
	)
}

function Hint({ keys, label }: { keys: string; label: string }) {
	return (
		<span className='flex items-center gap-1'>
			<Kbd>{keys}</Kbd>
			<span>{label}</span>
		</span>
	)
}

function priorityToLabel(priority: number) {
	switch (priority) {
		case 4:
			return 'P0'
		case 3:
			return 'P1'
		case 2:
			return 'P2'
		case 1:
			return 'P3'
		default:
			return 'P3'
	}
}
