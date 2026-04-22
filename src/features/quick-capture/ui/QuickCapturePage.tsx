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
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
	AlertTriangleIcon,
	CheckCircle2Icon,
	CircleIcon,
	FolderIcon,
	LoaderCircleIcon,
	PlusIcon,
	SearchIcon,
} from 'lucide-react'

import {
	createCaptureTask,
	normalizeCaptureTaskError,
	type CreateCaptureTaskCommandInput,
	type CreatedCaptureTaskPayload,
} from '@/features/quick-capture/api/createCaptureTask'
import { openCommandProject, openCommandTask } from '@/features/quick-capture/api/openCommandResult'
import {
	searchWorkspace,
	type WorkspaceProjectSearchItem,
	type WorkspaceSearchResult,
	type WorkspaceTaskSearchItem,
} from '@/features/global-search/api/searchWorkspace'
import { Button } from '@/shared/ui/base/button'
import { Kbd } from '@/shared/ui/base/kbd'
import { cn } from '@/shared/lib/utils'

type CommandMode = 'idle' | 'search' | 'create'
type CommandPriority = 'P0' | 'P1' | 'P2' | 'P3'
type CommandStatus = 'idle' | 'submitting' | 'success' | 'error'
type CommandResultItem =
	| ({ kind: 'task' } & WorkspaceTaskSearchItem)
	| ({ kind: 'project' } & WorkspaceProjectSearchItem)

type QuickCaptureSurfaceProps = {
	createTask?: (input: CreateCaptureTaskCommandInput) => Promise<CreatedCaptureTaskPayload>
	search?: typeof searchWorkspace
	openTask?: (taskId: string) => Promise<void>
	openProject?: (projectId: string) => Promise<void>
	closeWindow?: () => Promise<void> | void
	closeDelayMs?: number
}

const DEFAULT_CLOSE_DELAY_MS = 900
const SEARCH_LIMIT = 5
const EMPTY_RESULTS: WorkspaceSearchResult = {
	spaceSlug: null,
	tasks: [],
	projects: [],
}
const PRIORITIES: CommandPriority[] = ['P0', 'P1', 'P2', 'P3']
const PRIORITY_TO_PAYLOAD: Record<CommandPriority, string> = {
	P0: 'urgent',
	P1: 'high',
	P2: 'medium',
	P3: 'low',
}
const PRIORITY_CLASS: Record<CommandPriority, string> = {
	P0: 'border-(--sf-color-danger-soft-border) bg-(--sf-color-danger-soft) text-(--sf-color-danger-soft-text)',
	P1: 'border-(--sf-color-warning-soft-border) bg-(--sf-color-warning-soft) text-(--sf-color-warning-soft-text)',
	P2: 'border-(--sf-color-accent-soft-border) bg-accent text-accent-foreground',
	P3: 'border-(--sf-color-border-subtle) bg-muted text-(--sf-color-text-secondary)',
}

const ERROR_MESSAGES: Record<string, string> = {
	Validation: '请输入一个可以捕获的任务标题。',
	CaptureSpaceUnavailable: '当前 Space 不可用，暂时无法捕获。',
	DefaultSpaceUnavailable: '默认 Space 不可用，任务没有写入。',
	CapturePersistence: '写入任务失败，请稍后重试。',
}

function closeCurrentWindow() {
	// 隐藏而非销毁：面板实例常驻内存，保证全局快捷键 toggle 时能快速复用。
	return getCurrentWindow().hide()
}

function getErrorMessage(error: unknown) {
	const normalized = normalizeCaptureTaskError(error)

	if ('type' in normalized && typeof normalized.type === 'string') {
		return ERROR_MESSAGES[normalized.type] ?? normalized.message
	}

	return normalized.message || '操作失败，请稍后重试。'
}

function getSuccessMessage(payload: CreatedCaptureTaskPayload) {
	if (payload.spaceFallback) {
		return '已写入默认 Space 的 Inbox'
	}

	return '已写入当前 Space 的 Inbox'
}

export function QuickCapturePage() {
	useEffect(() => {
		document.body.dataset.quickCapture = 'true'
		return () => {
			delete document.body.dataset.quickCapture
		}
	}, [])

	return (
		<div className='flex h-full min-h-0 items-stretch bg-transparent p-[3px]'>
			<QuickCaptureSurface />
		</div>
	)
}

export function QuickCaptureSurface({
	createTask = createCaptureTask,
	search = searchWorkspace,
	openTask = openCommandTask,
	openProject = openCommandProject,
	closeWindow = closeCurrentWindow,
	closeDelayMs = DEFAULT_CLOSE_DELAY_MS,
}: QuickCaptureSurfaceProps) {
	const inputRef = useRef<HTMLInputElement>(null)
	const closeTimerRef = useRef<number | null>(null)
	const requestIdRef = useRef(0)
	const [query, setQuery] = useState('')
	const [priority, setPriority] = useState<CommandPriority>('P1')
	const [results, setResults] = useState<WorkspaceSearchResult>(EMPTY_RESULTS)
	const [highlightedIndex, setHighlightedIndex] = useState(0)
	const [isLoading, setIsLoading] = useState(false)
	const [status, setStatus] = useState<CommandStatus>('idle')
	const [message, setMessage] = useState('输入标题创建，或搜索已有任务与项目')
	const normalizedQuery = query.trim()
	const hasResults = results.tasks.length > 0 || results.projects.length > 0
	const mode: CommandMode = !normalizedQuery
		? 'idle'
		: hasResults || isLoading
			? 'search'
			: 'create'
	const flatItems = useMemo<CommandResultItem[]>(
		() => [
			...results.tasks.map((item) => ({ kind: 'task' as const, ...item })),
			...results.projects.map((item) => ({ kind: 'project' as const, ...item })),
		],
		[results.projects, results.tasks],
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

	const resetPanel = useCallback(() => {
		requestIdRef.current += 1
		setQuery('')
		setPriority('P1')
		setResults(EMPTY_RESULTS)
		setHighlightedIndex(0)
		setIsLoading(false)
		setStatus('idle')
		setMessage('输入标题创建，或搜索已有任务与项目')
		focusInput()
	}, [focusInput])

	useEffect(() => {
		resetPanel()

		let unlistenTauri: (() => void) | undefined
		listen<void>('quick-capture:shown', resetPanel).then((fn) => {
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
			requestIdRef.current += 1
			setResults(EMPTY_RESULTS)
			setIsLoading(false)
			setHighlightedIndex(0)
			return
		}

		const currentRequestId = requestIdRef.current + 1
		requestIdRef.current = currentRequestId
		setIsLoading(true)

		const timerId = window.setTimeout(() => {
			void search({
				spaceSlug: 'default',
				query: normalizedQuery,
				limit: SEARCH_LIMIT,
			})
				.then((payload) => {
					if (requestIdRef.current !== currentRequestId) return
					setResults(payload)
					setHighlightedIndex(0)
					setStatus('idle')
					setMessage('输入标题创建，或搜索已有任务与项目')
				})
				.catch((error) => {
					if (requestIdRef.current !== currentRequestId) return
					setResults(EMPTY_RESULTS)
					setStatus('error')
					setMessage(getErrorMessage(error))
				})
				.finally(() => {
					if (requestIdRef.current === currentRequestId) {
						setIsLoading(false)
					}
				})
		}, 120)

		return () => window.clearTimeout(timerId)
	}, [normalizedQuery, search])

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

	const submitCreate = useCallback(async () => {
		if (status === 'submitting') return
		if (!normalizedQuery) {
			setStatus('error')
			setMessage('请输入任务标题')
			focusInput()
			return
		}

		setStatus('submitting')
		setMessage('正在写入 Inbox...')

		try {
			const payload = await createTask({
				title: normalizedQuery,
				note: null,
				priority: PRIORITY_TO_PAYLOAD[priority],
			})

			setQuery('')
			setResults(EMPTY_RESULTS)
			setStatus('success')
			setMessage(getSuccessMessage(payload))

			if (payload.spaceFallback) {
				closeTimerRef.current = window.setTimeout(requestClose, closeDelayMs)
				return
			}

			requestClose()
		} catch (error) {
			setStatus('error')
			setMessage(getErrorMessage(error))
			focusInput()
		}
	}, [closeDelayMs, createTask, focusInput, normalizedQuery, priority, requestClose, status])

	const openResult = useCallback(
		async (item: CommandResultItem) => {
			setStatus('submitting')
			setMessage(item.kind === 'task' ? '正在打开任务...' : '正在打开项目...')

			try {
				if (item.kind === 'task') {
					await openTask(item.id)
				} else {
					await openProject(item.id)
				}
				requestClose()
			} catch (error) {
				setStatus('error')
				setMessage(getErrorMessage(error))
				focusInput()
			}
		},
		[focusInput, openProject, openTask, requestClose],
	)

	const executePrimaryAction = useCallback(() => {
		if (mode === 'search') {
			const activeItem = flatItems[highlightedIndex]
			if (activeItem) {
				void openResult(activeItem)
			}
			return
		}

		if (mode === 'create') {
			void submitCreate()
		}
	}, [flatItems, highlightedIndex, mode, openResult, submitCreate])

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault()
			executePrimaryAction()
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

	return (
		<section
			aria-label='StoneFlow Command'
			className='flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-(--sf-color-border-secondary) bg-card text-foreground shadow-(--sf-shadow-float)'
			onPointerDown={handleSurfacePointerDown}
		>
			<div className='flex items-center gap-2 border-b border-(--sf-color-divider) px-3.5 py-3'>
				<div className='flex h-9 flex-1 items-center gap-2 rounded-md border border-input bg-card px-3 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/14'>
					<SearchIcon className='size-3.5 shrink-0 text-(--sf-color-icon-subtle)' />
					<input
						ref={inputRef}
						aria-label='Command 输入'
						autoComplete='off'
						className='min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-(--sf-color-text-quaternary)'
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
						'h-9 min-w-22 gap-1.5 rounded-md px-3 text-[12px]',
						mode === 'create'
							? 'bg-primary text-primary-foreground hover:bg-(--sf-color-accent-hover)'
							: 'border border-border bg-card text-(--sf-color-text-secondary) hover:border-(--sf-color-accent-soft-border) hover:bg-accent hover:text-accent-foreground',
					)}
					disabled={status === 'submitting' || mode === 'idle'}
					onClick={executePrimaryAction}
					variant={mode === 'create' ? 'default' : 'ghost'}
				>
					{status === 'submitting' ? (
						<LoaderCircleIcon className='size-3.5 animate-spin' />
					) : mode === 'create' ? (
						<PlusIcon className='size-3.5' />
					) : (
						<SearchIcon className='size-3.5' />
					)}
					<span>{mode === 'create' ? '创建任务' : '打开'}</span>
				</Button>
			</div>

			{mode === 'create' ? (
				<div className='flex h-11 items-center gap-2 overflow-hidden border-b border-(--sf-color-divider) px-3.5'>
					<span className='shrink-0 text-[11.5px] text-(--sf-color-text-quaternary)'>优先级</span>
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
					<div className='mx-1 h-4 w-px bg-(--sf-color-divider)' />
					<span className='shrink-0 text-[11.5px] text-(--sf-color-text-quaternary)'>所属空间</span>
					<span className='rounded-md border border-border bg-card px-2.5 py-1 text-[12px] text-(--sf-color-text-secondary)'>
						{results.spaceSlug ?? '当前 Space'}
					</span>
					<div className='mx-1 h-4 w-px bg-(--sf-color-divider)' />
					<span className='shrink-0 text-[11.5px] text-(--sf-color-text-quaternary)'>所属项目</span>
					<span className='rounded-md border border-border bg-card px-2.5 py-1 text-[12px] text-(--sf-color-text-secondary)'>
						稍后归类
					</span>
				</div>
			) : null}

			<div className='min-h-0 flex-1 overflow-y-auto'>
				{mode === 'idle' ? (
					<CommandPanelState label='输入关键词搜索任务 / 项目；无匹配时直接创建任务。' />
				) : isLoading && !hasResults ? (
					<CommandPanelState label='正在搜索当前 Space...' loading />
				) : mode === 'create' ? (
					<CommandPanelState label={`没有匹配结果，按 Enter 创建“${normalizedQuery}”。`} />
				) : (
					<CommandResults
						highlightedIndex={highlightedIndex}
						projectItems={results.projects}
						taskItems={results.tasks}
						onHighlightIndex={setHighlightedIndex}
						onOpenResult={(item) => void openResult(item)}
					/>
				)}
			</div>

			<div className='flex min-h-10 items-center gap-3 border-t border-(--sf-color-divider) bg-muted px-3.5 text-[11px] text-(--sf-color-text-quaternary)'>
				<StatusMessage status={status} message={message} />
				<div className='ml-auto flex items-center gap-3'>
					<Hint keys='↑↓' label='选择' />
					<Hint keys='↵' label={mode === 'create' ? '创建' : '打开'} />
					{mode === 'create' ? <Hint keys='Tab' label='切优先级' /> : null}
					<Hint keys='Esc' label='关闭' />
				</div>
			</div>
		</section>
	)
}

function CommandResults({
	taskItems,
	projectItems,
	highlightedIndex,
	onHighlightIndex,
	onOpenResult,
}: {
	taskItems: WorkspaceTaskSearchItem[]
	projectItems: WorkspaceProjectSearchItem[]
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
		<section className='border-b border-(--sf-color-divider) last:border-b-0'>
			<div className='px-4 pb-1 pt-2 text-[10.5px] font-medium tracking-[0.06em] text-(--sf-color-text-quaternary)'>
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
	const subtitle = isTask ? (item.projectName ?? 'Inbox') : formatProjectStatus(item.status)

	return (
		<button
			className={cn(
				'relative flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors',
				isActive ? 'bg-accent' : 'hover:bg-(--sf-color-bg-surface-hover)',
			)}
			onClick={onOpen}
			onMouseEnter={onHighlight}
			type='button'
		>
			{isActive ? (
				<span className='absolute inset-y-0 left-0 w-[3px] rounded-r-sm bg-primary' />
			) : null}
			<span
				className={cn(
					'flex size-6 shrink-0 items-center justify-center rounded-md',
					isTask
						? 'bg-accent text-accent-foreground'
						: 'bg-(--sf-color-success-soft) text-(--sf-color-success-soft-text)',
				)}
			>
				{isTask ? <CircleIcon className='size-3' /> : <FolderIcon className='size-3.5' />}
			</span>
			<span className='min-w-0 flex-1'>
				<span className='block truncate text-[13px] text-foreground'>{title}</span>
				<span className='mt-0.5 block truncate text-[11.5px] text-(--sf-color-text-quaternary)'>
					{subtitle}
				</span>
			</span>
			{isTask && item.priority ? <PriorityBadge priority={item.priority} /> : null}
			<span className='rounded-sm border border-(--sf-color-border-subtle) bg-muted px-1.5 py-0.5 text-[11px] text-(--sf-color-text-quaternary)'>
				{isTask ? '任务' : '项目'}
			</span>
		</button>
	)
}

function PriorityBadge({ priority }: { priority: string }) {
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
		<span className={cn('rounded-sm border px-1.5 py-0.5 font-mono text-[10.5px]', className)}>
			{label}
		</span>
	)
}

function CommandPanelState({ label, loading = false }: { label: string; loading?: boolean }) {
	return (
		<div className='flex h-full min-h-44 items-center justify-center px-5 text-center text-[13px] text-(--sf-color-text-quaternary)'>
			<div className='flex items-center gap-2'>
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
					? 'text-destructive'
					: status === 'success'
						? 'text-success-foreground'
						: 'text-(--sf-color-text-quaternary)',
			)}
		>
			{status === 'error' ? <AlertTriangleIcon className='size-3.5 shrink-0' /> : null}
			{status === 'success' ? <CheckCircle2Icon className='size-3.5 shrink-0' /> : null}
			{status === 'submitting' ? (
				<LoaderCircleIcon className='size-3.5 shrink-0 animate-spin' />
			) : null}
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

function priorityToLabel(priority: string) {
	switch (priority) {
		case 'urgent':
			return 'P0'
		case 'high':
			return 'P1'
		case 'medium':
			return 'P2'
		case 'low':
			return 'P3'
		default:
			return 'P3'
	}
}

function formatProjectStatus(status: string) {
	switch (status) {
		case 'active':
			return '进行中'
		default:
			return status
	}
}
