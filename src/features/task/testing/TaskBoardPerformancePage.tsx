import {
	Profiler,
	useCallback,
	useMemo,
	useRef,
	useState,
	type ProfilerOnRenderCallback,
} from 'react'

import { BulkActionProvider, type BulkAction } from '@/features/bulk-action'
import {
	COMMAND_IDS,
	CommandRegistry,
	CommandRuntime,
	CommandRuntimeProvider,
	createEmptyCommandContext,
	type Command,
} from '@/features/command'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import type { TaskDisplayPropertyKey } from '@/features/display-options'
import { useCollectionInteraction } from '@/features/selection'
import { AppScrollArea } from '@/shared/components/AppScrollArea'
import type { TaskStatus } from '@/shared/types'

import { TaskBoard, TaskBoardOrdinaryCandidate } from '../components/TaskBoard'
import { focusTaskBoardTaskId } from '../components/taskBoardFocus'
import { buildTaskBoardFlatItems } from '../model/taskBoardModel'
import { TASK_BOARD_STATUS_ORDER } from '../model/taskBoardOrder'
import {
	TASK_BOARD_PERFORMANCE_LOADED_COUNTS,
	TASK_BOARD_PERFORMANCE_PAGE_SIZE,
	TASK_BOARD_PERFORMANCE_PROJECT_OPTIONS,
	TASK_BOARD_PERFORMANCE_SPACES,
	createTaskBoardPerformanceLoadedFixture,
	createTaskBoardPerformancePagingSession,
	type TaskBoardPerformancePagingSession,
	type TaskBoardPerformancePagingSnapshot,
} from './taskBoardPerformanceFixtures'

const SCROLL_RUN_COUNT = 5
const SCROLL_RUN_DURATION_MS = 5_000
const WARMUP_DURATION_MS = 1_000
const FOCUS_SAMPLE_COUNT = 50
const KEYBOARD_MOVE_COUNT = 100
const LONG_TASK_THRESHOLD_MS = 50
const SCROLL_STEP_MS = 50
const PAGING_TOTAL_COUNT = 600
const PAGING_FAIL_ONCE_AT_PAGE = 2
const ROW_SELECTOR = '[data-task-id]'
const EMPTY_BULK_ACTIONS: BulkAction[] = []
const VISIBLE_PROPERTIES: TaskDisplayPropertyKey[] = [
	'status',
	'priority',
	'project',
	'dueAt',
	'plannedAt',
	'updatedAt',
	'createdAt',
]
const EXTERNAL_EVIDENCE_REQUIREMENTS = [
	{
		artifact: 'native-input-run',
		platforms: ['macOS WKWebView', 'Windows WebView2'],
		required: [
			'trackpad fling/reverse fling',
			'scrollbar thumb drag',
			'J/K/Arrow navigation and range selection',
			'section collapse/context menu/detail focus',
			'page append/retry/exhaustion',
			'long-session user-perceived responsiveness',
		],
	},
	{
		artifact: 'platform-performance-trace',
		platforms: ['macOS WKWebView', 'Windows WebView2'],
		required: ['scripting', 'style', 'layout', 'paint', '50ms long tasks'],
	},
	{
		artifact: 'react-profiling-build',
		platforms: ['macOS WKWebView', 'Windows WebView2'],
		required: ['raw React commits'],
		note: '仅作同构辅助；不能替代普通 production build 与原生交互证据。',
	},
	{
		artifact: 'process-memory-and-dom',
		platforms: ['macOS WKWebView', 'Windows WebView2'],
		required: ['process memory over a long session', 'mounted rows', 'board DOM elements'],
	},
] as const

type Engine = 'virtual' | 'ordinary'
type ScenarioKind = 'loaded' | 'paged'
type LoadedCount = (typeof TASK_BOARD_PERFORMANCE_LOADED_COUNTS)[number]

type RowObserverSnapshot = {
	mountedRows: number
	mountedRowPeak: number
	mountCount: number
	unmountCount: number
	domElements: number
	domElementPeak: number
}

type ScrollRunResult = {
	index: number
	durationMs: number
	rowObserverBefore: RowObserverSnapshot
	rowObserverAfter: RowObserverSnapshot
}

type FocusSampleResult = {
	index: number
	taskId: string | null
	durationMs: number | null
	succeeded: boolean
}

type KeyboardMoveResult = {
	index: number
	fromTaskId: string | null
	expectedTaskId: string
	actualTaskId: string | null
	durationMs: number
	defaultPrevented: boolean
	succeeded: boolean
}

type LongTaskEvidence = {
	supported: boolean
	thresholdMs: typeof LONG_TASK_THRESHOLD_MS
	samples: Array<{ startTimeMs: number; durationMs: number }> | null
}

type ReactProfilerCommit = {
	id: string
	phase: string
	actualDurationMs: number
	baseDurationMs: number
	startTimeMs: number
	commitTimeMs: number
}

type TaskBoardScenarioResult = {
	completedAt: string
	engine: Engine
	scenario: {
		key: string
		kind: ScenarioKind
		seed: number
		initialLoadedTaskCount: number
		finalLoadedTaskCount: number
		totalCount: number
	}
	environment: {
		commit: string
		device: string
		os: string
		webview: string
		minimumSupportedWebView: string
		cpu: string
		physicalMemory: string
		windowViewport: { width: number; height: number; devicePixelRatio: number }
		boardViewport: { width: number; height: number }
		userAgent: string
		hardwareConcurrency: number | null
	}
	syntheticRunner: {
		inputKind: 'programmatic-scroll-and-keyboard-events'
		warmupDurationMs: number
		scrollRuns: ScrollRunResult[]
		focusSamples: FocusSampleResult[]
		keyboardMoves: KeyboardMoveResult[]
		longTasks: LongTaskEvidence
		rowObserver: RowObserverSnapshot
		pagination: {
			applicable: boolean
			pageSize: number | null
			failOnceAtPage: number | null
			observedError: string | null
			retryButtonClickCount: number | null
			fetchRequestCount: number | null
			duplicateFetchCount: number | null
			finalState: TaskBoardPerformancePagingSnapshot['state'] | null
			reachedExhausted: boolean | null
			driveAttempts: number | null
			durationMs: number | null
		}
		reactProfiler: {
			supported: boolean
			commits: ReactProfilerCommit[] | null
			limitation: string
		}
	}
	externalEvidenceStatus: 'required-not-recorded-by-runner'
}

type TaskBoardBenchmarkReport = {
	schemaVersion: 2
	generatedAt: string
	protocol: {
		buildMode: 'production'
		engines: readonly Engine[]
		loadedTaskCounts: typeof TASK_BOARD_PERFORMANCE_LOADED_COUNTS
		pagedScenario: {
			initialTaskCount: number
			totalCount: number
			failOnceAtPage: typeof PAGING_FAIL_ONCE_AT_PAGE
		}
		seedProfile: 'deterministic-rich-task-fixture'
		repeats: {
			warmupCount: 1
			scrollRunCount: number
			scrollRunDurationMs: number
			focusSampleCount: number
			keyboardMoveCount: number
		}
		longTaskThresholdMs: typeof LONG_TASK_THRESHOLD_MS
		comparisonOrder: 'virtual-before-ordinary-for-each-scenario'
		ordinaryStrategy: 'document-flow-css-sticky-content-visibility-auto'
		phaseOrder: readonly ['reset', 'pagination', 'warmup', 'formal-measurement']
		formalInitialState: {
			openSections: 'all-status-sections'
			selection: 'empty'
			focusedTaskId: null
			scrollTop: 0
		}
		formalObserverScope: string
		winnerRule: string
		syntheticEvidenceBoundary: string
	}
	externalEvidenceRequirements: typeof EXTERNAL_EVIDENCE_REQUIREMENTS
	results: TaskBoardScenarioResult[]
}

const noop = () => undefined
const noopAsync = async () => undefined
const BENCHMARK_COMMAND_CONTEXT = createEmptyCommandContext()
const BENCHMARK_COMMANDS: Command[] = [
	[COMMAND_IDS.taskSelect, '选择任务'],
	[COMMAND_IDS.taskPeek, '预览任务'],
	[COMMAND_IDS.taskOpenDetail, '打开任务详情'],
	[COMMAND_IDS.taskComplete, '完成任务'],
	[COMMAND_IDS.taskSetPriority, '设置任务优先级'],
	[COMMAND_IDS.taskSetStatus, '设置任务状态'],
	[COMMAND_IDS.taskOpenDateMenu, '设置任务日期'],
	[COMMAND_IDS.taskChangePlacement, '移动任务'],
	[COMMAND_IDS.taskArchive, '归档任务'],
	[COMMAND_IDS.taskDelete, '删除任务'],
].map(([id, title]) => ({
	id,
	title,
	category: 'task',
	scope: ['task-list'],
	run: noop,
}))
const BENCHMARK_COMMAND_RUNTIME = new CommandRuntime({
	registry: new CommandRegistry(BENCHMARK_COMMANDS),
	getContext: () => BENCHMARK_COMMAND_CONTEXT,
})

export function TaskBoardPerformancePage() {
	const [scenarioKind, setScenarioKind] = useState<ScenarioKind>('loaded')
	const [loadedCount, setLoadedCount] = useState<LoadedCount>(150)
	const [engine, setEngine] = useState<Engine>('virtual')
	const commit = import.meta.env.VITE_BENCHMARK_COMMIT ?? ''
	const [device, setDevice] = useState('')
	const [os, setOs] = useState('')
	const [webview, setWebview] = useState('')
	const [minimumSupportedWebView, setMinimumSupportedWebView] = useState('')
	const [cpu, setCpu] = useState('')
	const [physicalMemory, setPhysicalMemory] = useState('')
	const [results, setResults] = useState<TaskBoardScenarioResult[]>([])
	const [running, setRunning] = useState(false)
	const [runRevision, setRunRevision] = useState(0)
	const [openSections, setOpenSections] = useState<TaskStatus[]>(() => [...TASK_BOARD_STATUS_ORDER])
	const [pagingSnapshot, setPagingSnapshot] = useState(() =>
		createTaskBoardPerformancePagingSession({ totalCount: PAGING_TOTAL_COUNT }).getSnapshot(),
	)
	const boardHostRef = useRef<HTMLDivElement>(null)
	const viewportRef = useRef<HTMLDivElement>(null)
	const statusRef = useRef<HTMLSpanElement>(null)
	const openSectionsRef = useRef<readonly TaskStatus[]>(openSections)
	const pagingSessionRef = useRef<TaskBoardPerformancePagingSession | null>(null)
	const navigableKeysRef = useRef<readonly string[]>([])
	const profilerCommitsRef = useRef<ReactProfilerCommit[]>([])
	const collectProfilerRef = useRef(false)
	openSectionsRef.current = openSections

	const loadedFixture = useMemo(
		() => createTaskBoardPerformanceLoadedFixture(loadedCount),
		[loadedCount],
	)
	const fixture = scenarioKind === 'loaded' ? loadedFixture : pagingSnapshot
	const scenarioKey = getScenarioKey(scenarioKind, loadedCount)
	const flatItems = useMemo(
		() =>
			buildTaskBoardFlatItems({
				tasks: fixture.tasks,
				openSections,
			}),
		[fixture.tasks, openSections],
	)
	const navigableKeys = useMemo(
		() => flatItems.flatMap((item) => (item.kind === 'row' ? [item.key] : [])),
		[flatItems],
	)
	navigableKeysRef.current = navigableKeys
	const collectionInteraction = useCollectionInteraction({
		eligibleKeys: navigableKeys,
		navigableKeys,
	})
	const hasVirtualBaseline = results.some(
		(result) =>
			result.engine === 'virtual' &&
			result.scenario.key === scenarioKey &&
			matchesCurrentEnvironment(result),
	)
	const metadataReady = [
		commit,
		device,
		os,
		webview,
		minimumSupportedWebView,
		cpu,
		physicalMemory,
	].every((value) => value.trim().length > 0)
	const runBlocked = running || !metadataReady || (engine === 'ordinary' && !hasVirtualBaseline)

	const handleFetchNextPage = useCallback(async () => {
		const session = pagingSessionRef.current
		if (!session) return
		const request = session.fetchNextPage()
		setPagingSnapshot(session.getSnapshot())
		try {
			return await request
		} finally {
			if (pagingSessionRef.current === session) setPagingSnapshot(session.getSnapshot())
		}
	}, [])

	const handleProfilerRender: ProfilerOnRenderCallback = useCallback(
		(id, phase, actualDuration, baseDuration, startTime, commitTime) => {
			if (!collectProfilerRef.current) return
			profilerCommitsRef.current.push({
				id,
				phase,
				actualDurationMs: roundMs(actualDuration),
				baseDurationMs: roundMs(baseDuration),
				startTimeMs: roundMs(startTime),
				commitTimeMs: roundMs(commitTime),
			})
		},
		[],
	)

	const report = useMemo<TaskBoardBenchmarkReport>(
		() => ({
			schemaVersion: 2,
			generatedAt: results.at(-1)?.completedAt ?? new Date().toISOString(),
			protocol: {
				buildMode: 'production',
				engines: ['virtual', 'ordinary'],
				loadedTaskCounts: TASK_BOARD_PERFORMANCE_LOADED_COUNTS,
				pagedScenario: {
					initialTaskCount: TASK_BOARD_PERFORMANCE_PAGE_SIZE,
					totalCount: PAGING_TOTAL_COUNT,
					failOnceAtPage: PAGING_FAIL_ONCE_AT_PAGE,
				},
				seedProfile: 'deterministic-rich-task-fixture',
				repeats: {
					warmupCount: 1,
					scrollRunCount: SCROLL_RUN_COUNT,
					scrollRunDurationMs: SCROLL_RUN_DURATION_MS,
					focusSampleCount: FOCUS_SAMPLE_COUNT,
					keyboardMoveCount: KEYBOARD_MOVE_COUNT,
				},
				longTaskThresholdMs: LONG_TASK_THRESHOLD_MS,
				comparisonOrder: 'virtual-before-ordinary-for-each-scenario',
				ordinaryStrategy: 'document-flow-css-sticky-content-visibility-auto',
				phaseOrder: ['reset', 'pagination', 'warmup', 'formal-measurement'],
				formalInitialState: {
					openSections: 'all-status-sections',
					selection: 'empty',
					focusedTaskId: null,
					scrollTop: 0,
				},
				formalObserverScope:
					'Long Tasks、React Profiler 与 DOM churn 仅覆盖 warmup 后的 5 次滚动、焦点恢复和键盘移动；不含重置、mount、分页和 warmup。',
				winnerRule:
					'ordinary 仅在 10,000 条 rich rows、macOS WKWebView 与 Windows WebView2、键盘/焦点/分页不退化且内存与 DOM 可接受时胜出；缺平台、平局或证据冲突均保留 virtual。',
				syntheticEvidenceBoundary:
					'本 runner 的程序化滚动与键盘事件只提供可重复辅助数据，不是原生 fling、滚动条拖拽、用户感知或平台 performance trace 证据。',
			},
			externalEvidenceRequirements: EXTERNAL_EVIDENCE_REQUIREMENTS,
			results,
		}),
		[results],
	)
	const reportJson = useMemo(() => JSON.stringify(report, null, 2), [report])

	function updateStatus(message: string) {
		if (statusRef.current) statusRef.current.textContent = message
	}

	function matchesCurrentEnvironment(result: TaskBoardScenarioResult) {
		const environment = result.environment
		const viewport = viewportRef.current
		return (
			environment.commit === commit.trim() &&
			environment.device === device.trim() &&
			environment.os === os.trim() &&
			environment.webview === webview.trim() &&
			environment.minimumSupportedWebView === minimumSupportedWebView.trim() &&
			environment.cpu === cpu.trim() &&
			environment.physicalMemory === physicalMemory.trim() &&
			environment.windowViewport.width === window.innerWidth &&
			environment.windowViewport.height === window.innerHeight &&
			environment.windowViewport.devicePixelRatio === window.devicePixelRatio &&
			(!viewport ||
				(environment.boardViewport.width === viewport.clientWidth &&
					environment.boardViewport.height === viewport.clientHeight))
		)
	}

	async function runBenchmark() {
		const boardHost = boardHostRef.current
		const viewport = viewportRef.current
		if (!boardHost || !viewport || running || !metadataReady) return
		if (
			engine === 'ordinary' &&
			!results.some(
				(result) =>
					result.engine === 'virtual' &&
					result.scenario.key === scenarioKey &&
					matchesCurrentEnvironment(result),
			)
		) {
			updateStatus('当前场景、构建、设备与视口必须先完成 virtual baseline')
			return
		}

		setRunning(true)
		updateStatus(`正在重置 ${engine} / ${scenarioKey}…`)
		collectProfilerRef.current = false
		let rowObserver: ReturnType<typeof observeTaskBoardDom> | null = null
		let longTaskObserver: ReturnType<typeof observeLongTasks> | null = null
		const initialLoadedTaskCount =
			scenarioKind === 'loaded' ? loadedFixture.tasks.length : TASK_BOARD_PERFORMANCE_PAGE_SIZE

		try {
			if (scenarioKind === 'paged') resetPagingSession()
			setOpenSections([...TASK_BOARD_STATUS_ORDER])
			collectionInteraction.clearSelection()
			collectionInteraction.focusKey(null)
			if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
			viewport.scrollTop = 0
			viewport.dispatchEvent(new Event('scroll'))
			setRunRevision((value) => value + 1)
			await waitForPaint()
			viewport.scrollTop = 0
			viewport.dispatchEvent(new Event('scroll'))
			await waitForPaint()

			updateStatus(`正在验证分页失败与重试 ${engine} / ${scenarioKey}…`)
			const paginationPhase =
				scenarioKind === 'paged'
					? await drivePagingToExhaustion(boardHost, viewport, () =>
							pagingSessionRef.current?.getSnapshot(),
						)
					: null
			if (
				scenarioKind === 'paged' &&
				(pagingSessionRef.current?.getSnapshot().state !== 'exhausted' ||
					pagingSessionRef.current.getSnapshot().tasks.length !== PAGING_TOTAL_COUNT ||
					pagingSessionRef.current.getSnapshot().fetchRequestCount !==
						Math.ceil(PAGING_TOTAL_COUNT / TASK_BOARD_PERFORMANCE_PAGE_SIZE) ||
					pagingSessionRef.current.getSnapshot().duplicateFetchCount !== 0 ||
					!paginationPhase?.observedError ||
					paginationPhase.retryButtonClickCount !== 1)
			) {
				throw new Error('分页场景未完成一次失败、真实按钮重试与 exhausted，本次结果已丢弃')
			}

			updateStatus(`正在预热 ${engine} / ${scenarioKey}…`)
			await driveScroll(viewport, WARMUP_DURATION_MS)
			viewport.scrollTop = 0
			viewport.dispatchEvent(new Event('scroll'))
			await waitForPaint()
			const initialInteraction = collectionInteraction.getSnapshot()
			if (
				initialInteraction.selectedKeys.size > 0 ||
				initialInteraction.focusedKey !== null ||
				viewport.scrollTop !== 0 ||
				TASK_BOARD_STATUS_ORDER.some((status) => !openSectionsRef.current.includes(status))
			) {
				throw new Error('正式测量初态未恢复为全分区展开、空选择、空焦点和 scrollTop=0')
			}

			const viewportAtStart = {
				windowWidth: window.innerWidth,
				windowHeight: window.innerHeight,
				devicePixelRatio: window.devicePixelRatio,
				boardWidth: viewport.clientWidth,
				boardHeight: viewport.clientHeight,
			}
			profilerCommitsRef.current = []
			collectProfilerRef.current = true
			rowObserver = observeTaskBoardDom(boardHost)
			longTaskObserver = observeLongTasks()
			const scrollRuns: ScrollRunResult[] = []

			for (let index = 0; index < SCROLL_RUN_COUNT; index += 1) {
				updateStatus(`正在滚动 ${engine} / ${scenarioKey}：${index + 1}/${SCROLL_RUN_COUNT}`)
				const rowObserverBefore = rowObserver.read()
				const startedAt = performance.now()
				await driveScroll(viewport, SCROLL_RUN_DURATION_MS)
				await wait(0)
				scrollRuns.push({
					index: index + 1,
					durationMs: roundMs(performance.now() - startedAt),
					rowObserverBefore,
					rowObserverAfter: rowObserver.read(),
				})
			}

			const currentKeys = navigableKeysRef.current
			updateStatus(`正在测量 ${FOCUS_SAMPLE_COUNT} 次焦点恢复…`)
			const focusSamples = await measureFocusSamples(currentKeys)
			updateStatus(`正在测量 ${KEYBOARD_MOVE_COUNT} 次 J 键移动…`)
			const keyboardMoves = await measureKeyboardMoves(currentKeys)
			await wait(0)
			if (
				window.innerWidth !== viewportAtStart.windowWidth ||
				window.innerHeight !== viewportAtStart.windowHeight ||
				window.devicePixelRatio !== viewportAtStart.devicePixelRatio ||
				viewport.clientWidth !== viewportAtStart.boardWidth ||
				viewport.clientHeight !== viewportAtStart.boardHeight
			) {
				throw new Error('测量期间视口发生变化，本次结果已丢弃')
			}

			const finalPagingSnapshot =
				scenarioKind === 'paged' ? (pagingSessionRef.current?.getSnapshot() ?? null) : null
			const profilerCommits = profilerCommitsRef.current.slice()
			const nextResult: TaskBoardScenarioResult = {
				completedAt: new Date().toISOString(),
				engine,
				scenario: {
					key: scenarioKey,
					kind: scenarioKind,
					seed: fixture.seed,
					initialLoadedTaskCount,
					finalLoadedTaskCount:
						scenarioKind === 'loaded'
							? loadedFixture.tasks.length
							: (finalPagingSnapshot?.tasks.length ?? initialLoadedTaskCount),
					totalCount: scenarioKind === 'loaded' ? loadedFixture.totalCount : PAGING_TOTAL_COUNT,
				},
				environment: {
					commit: commit.trim(),
					device: device.trim(),
					os: os.trim(),
					webview: webview.trim(),
					minimumSupportedWebView: minimumSupportedWebView.trim(),
					cpu: cpu.trim(),
					physicalMemory: physicalMemory.trim(),
					windowViewport: {
						width: window.innerWidth,
						height: window.innerHeight,
						devicePixelRatio: window.devicePixelRatio,
					},
					boardViewport: { width: viewport.clientWidth, height: viewport.clientHeight },
					userAgent: navigator.userAgent,
					hardwareConcurrency: navigator.hardwareConcurrency || null,
				},
				syntheticRunner: {
					inputKind: 'programmatic-scroll-and-keyboard-events',
					warmupDurationMs: WARMUP_DURATION_MS,
					scrollRuns,
					focusSamples,
					keyboardMoves,
					longTasks: longTaskObserver.read(),
					rowObserver: rowObserver.read(),
					pagination: {
						applicable: scenarioKind === 'paged',
						pageSize: scenarioKind === 'paged' ? TASK_BOARD_PERFORMANCE_PAGE_SIZE : null,
						failOnceAtPage: scenarioKind === 'paged' ? PAGING_FAIL_ONCE_AT_PAGE : null,
						observedError: paginationPhase?.observedError ?? null,
						retryButtonClickCount: paginationPhase?.retryButtonClickCount ?? null,
						fetchRequestCount: finalPagingSnapshot?.fetchRequestCount ?? null,
						duplicateFetchCount: finalPagingSnapshot?.duplicateFetchCount ?? null,
						finalState: finalPagingSnapshot?.state ?? null,
						reachedExhausted:
							scenarioKind === 'paged' ? finalPagingSnapshot?.state === 'exhausted' : null,
						driveAttempts: paginationPhase?.driveAttempts ?? null,
						durationMs: paginationPhase?.durationMs ?? null,
					},
					reactProfiler: {
						supported: profilerCommits.length > 0,
						commits: profilerCommits.length > 0 ? profilerCommits : null,
						limitation:
							'普通 React production build 通常不触发 Profiler onRender；null 表示 unavailable，不表示零提交或零开销。需另存 profiling build raw artifact。',
					},
				},
				externalEvidenceStatus: 'required-not-recorded-by-runner',
			}

			setResults((current) => [
				...current.filter(
					(result) =>
						!(
							result.engine === engine &&
							result.scenario.key === scenarioKey &&
							matchesCurrentEnvironment(result)
						),
				),
				nextResult,
			])
			updateStatus(`${engine} / ${scenarioKey} 测量完成`)
		} catch (error) {
			updateStatus(error instanceof Error ? error.message : String(error))
		} finally {
			collectProfilerRef.current = false
			rowObserver?.disconnect()
			longTaskObserver?.disconnect()
			setRunning(false)
		}
	}

	function resetPagingSession() {
		const session = createTaskBoardPerformancePagingSession({
			totalCount: PAGING_TOTAL_COUNT,
			failOnceAtPage: PAGING_FAIL_ONCE_AT_PAGE,
		})
		pagingSessionRef.current = session
		setPagingSnapshot(session.getSnapshot())
	}

	function handleSectionOpenChange(_groupKey: string, section: TaskStatus, open: boolean) {
		setOpenSections((current) =>
			open
				? TASK_BOARD_STATUS_ORDER.filter((status) => status === section || current.includes(status))
				: current.filter((status) => status !== section),
		)
	}

	function collapseAllSections() {
		setOpenSections([])
	}

	function expandAllSections() {
		setOpenSections([...TASK_BOARD_STATUS_ORDER])
	}

	function handleScenarioKindChange(nextKind: ScenarioKind) {
		if (running) return
		const nextKey = getScenarioKey(nextKind, loadedCount)
		setScenarioKind(nextKind)
		if (nextKind === 'paged') resetPagingSession()
		if (
			!results.some(
				(result) =>
					result.engine === 'virtual' &&
					result.scenario.key === nextKey &&
					matchesCurrentEnvironment(result),
			)
		) {
			setEngine('virtual')
		}
	}

	function handleLoadedCountChange(nextCount: LoadedCount) {
		if (running) return
		const nextKey = getScenarioKey('loaded', nextCount)
		setLoadedCount(nextCount)
		if (
			!results.some(
				(result) =>
					result.engine === 'virtual' &&
					result.scenario.key === nextKey &&
					matchesCurrentEnvironment(result),
			)
		) {
			setEngine('virtual')
		}
	}

	async function copyReport() {
		try {
			await navigator.clipboard.writeText(reportJson)
			updateStatus('JSON 已复制')
		} catch (error) {
			updateStatus(`复制失败：${error instanceof Error ? error.message : String(error)}`)
		}
	}

	function downloadReport() {
		const url = URL.createObjectURL(new Blob([reportJson], { type: 'application/json' }))
		const anchor = document.createElement('a')
		anchor.href = url
		anchor.download = `task-board-benchmark-${commit.trim() || 'unknown'}.json`
		anchor.click()
		URL.revokeObjectURL(url)
	}

	const Board = engine === 'virtual' ? TaskBoard : TaskBoardOrdinaryCandidate
	const pagination =
		scenarioKind === 'loaded'
			? {
					sourceKey: `benchmark:${engine}:${scenarioKey}:${runRevision}`,
					loadedPageCount: 1,
					state: 'exhausted' as const,
					totalCount: loadedFixture.totalCount,
				}
			: pagingSnapshot.state === 'exhausted'
				? {
						sourceKey: `benchmark:${engine}:${scenarioKey}:${runRevision}`,
						loadedPageCount: pagingSnapshot.loadedPageCount,
						state: 'exhausted' as const,
						totalCount: pagingSnapshot.totalCount,
					}
				: pagingSnapshot.state === 'error'
					? {
							sourceKey: `benchmark:${engine}:${scenarioKey}:${runRevision}`,
							loadedPageCount: pagingSnapshot.loadedPageCount,
							state: 'error' as const,
							error: pagingSnapshot.error ?? '分页失败',
							fetchNextPage: handleFetchNextPage,
							totalCount: pagingSnapshot.totalCount,
						}
					: {
							sourceKey: `benchmark:${engine}:${scenarioKey}:${runRevision}`,
							loadedPageCount: pagingSnapshot.loadedPageCount,
							state: pagingSnapshot.state,
							fetchNextPage: handleFetchNextPage,
							totalCount: pagingSnapshot.totalCount,
						}

	return (
		<CommandRuntimeProvider context={BENCHMARK_COMMAND_CONTEXT} runtime={BENCHMARK_COMMAND_RUNTIME}>
			<DangerConfirmProvider>
				<BulkActionProvider actions={EMPTY_BULK_ACTIONS}>
					<main className='flex h-screen min-h-0 flex-col bg-surface-secondary text-foreground'>
						<header className='grid gap-3 border-b border-separator px-4 py-3'>
							<div className='flex flex-wrap items-center gap-3'>
								<h1 className='mr-auto text-sm font-semibold'>TaskBoard schema v2 性能证据</h1>
								<label className='flex items-center gap-2 text-xs'>
									场景
									<select
										aria-label='性能场景'
										disabled={running}
										value={scenarioKind}
										onChange={(event) =>
											handleScenarioKindChange(event.target.value as ScenarioKind)
										}
									>
										<option value='loaded'>已加载 rich rows</option>
										<option value='paged'>分页 150 → 600（直至 exhausted）</option>
									</select>
								</label>
								{scenarioKind === 'loaded' ? (
									<label className='flex items-center gap-2 text-xs'>
										行数
										<select
											aria-label='已加载任务数'
											disabled={running}
											value={loadedCount}
											onChange={(event) =>
												handleLoadedCountChange(Number(event.target.value) as LoadedCount)
											}
										>
											{TASK_BOARD_PERFORMANCE_LOADED_COUNTS.map((count) => (
												<option key={count} value={count}>
													{count.toLocaleString()}
												</option>
											))}
										</select>
									</label>
								) : null}
								<label className='flex items-center gap-2 text-xs'>
									Engine
									<select
										aria-label='列表 engine'
										disabled={running}
										value={engine}
										onChange={(event) => setEngine(event.target.value as Engine)}
									>
										<option value='virtual'>virtual（先测）</option>
										<option disabled={!hasVirtualBaseline} value='ordinary'>
											ordinary + content-visibility（需 virtual baseline）
										</option>
									</select>
								</label>
								<button disabled={runBlocked} onClick={() => void runBenchmark()} type='button'>
									{running ? '测量中…' : '运行当前场景'}
								</button>
								<button
									disabled={results.length === 0}
									onClick={() => void copyReport()}
									type='button'
								>
									复制 JSON
								</button>
								<button disabled={results.length === 0} onClick={downloadReport} type='button'>
									下载 JSON
								</button>
								<span
									ref={statusRef}
									aria-live='polite'
									className='inline-block w-64 shrink-0 truncate text-xs'
									role='status'
								>
									等待测量
								</span>
							</div>
							<div className='grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7'>
								<MetadataInput disabled label='Commit' value={commit} onChange={noop} />
								<MetadataInput
									disabled={running}
									label='设备'
									value={device}
									onChange={setDevice}
								/>
								<MetadataInput disabled={running} label='OS' value={os} onChange={setOs} />
								<MetadataInput
									disabled={running}
									label='WebView'
									value={webview}
									onChange={setWebview}
								/>
								<MetadataInput
									disabled={running}
									label='最低 WebView'
									value={minimumSupportedWebView}
									onChange={setMinimumSupportedWebView}
								/>
								<MetadataInput disabled={running} label='CPU' value={cpu} onChange={setCpu} />
								<MetadataInput
									disabled={running}
									label='物理内存'
									value={physicalMemory}
									onChange={setPhysicalMemory}
								/>
							</div>
							<p className='text-xs text-foreground-500'>
								必须填写环境元数据。这里的合成滚动不是原生手势证据；两平台原生交互、trace
								与进程内存需作为外部 artifact 另存。
							</p>
						</header>

						<div className='grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px]'>
							<div className='min-h-0' ref={boardHostRef}>
								<AppScrollArea ref={viewportRef}>
									<Profiler
										id={`task-board:${engine}:${scenarioKey}`}
										onRender={handleProfilerRender}
									>
										<Board
											key={runRevision}
											collectionInteraction={collectionInteraction}
											flatItems={flatItems}
											focusIntent={null}
											onCollapseAll={collapseAllSections}
											onEmptyAction={noop}
											onExpandAll={expandAllSections}
											onFocusIntentConsumed={noop}
											onRetry={noop}
											onSectionOpenChange={handleSectionOpenChange}
											onSelectPlacement={noop}
											onToggleTaskStatus={noopAsync}
											onUpdateTaskDueDate={noopAsync}
											onUpdateTaskPriority={noopAsync}
											onUpdateTaskReminderAt={noopAsync}
											onUpdateTaskScheduledAt={noopAsync}
											onUpdateTaskStatus={noopAsync}
											pagination={pagination}
											pendingTaskId={null}
											projectOptions={TASK_BOARD_PERFORMANCE_PROJECT_OPTIONS}
											showProjectCellOptions
											showSpaceLabel
											spaces={TASK_BOARD_PERFORMANCE_SPACES}
											status='ready'
											tasks={fixture.tasks}
											visibleProperties={VISIBLE_PROPERTIES}
										/>
									</Profiler>
								</AppScrollArea>
							</div>

							<textarea
								aria-label='性能测量 JSON'
								className='h-full resize-none border-l border-separator bg-surface p-3 font-mono text-xs'
								readOnly
								value={reportJson}
							/>
						</div>
					</main>
				</BulkActionProvider>
			</DangerConfirmProvider>
		</CommandRuntimeProvider>
	)
}

function MetadataInput({
	disabled,
	label,
	value,
	onChange,
}: {
	disabled: boolean
	label: string
	value: string
	onChange: (value: string) => void
}) {
	return (
		<label className='grid gap-1 text-xs'>
			{label}
			<input
				aria-label={label}
				disabled={disabled}
				value={value}
				onChange={(event) => onChange(event.target.value)}
			/>
		</label>
	)
}

function getScenarioKey(kind: ScenarioKind, loadedCount: LoadedCount) {
	return kind === 'loaded'
		? `loaded:${loadedCount}`
		: `paged:${TASK_BOARD_PERFORMANCE_PAGE_SIZE}-${PAGING_TOTAL_COUNT}`
}

async function driveScroll(viewport: HTMLElement, durationMs: number) {
	const startedAt = performance.now()
	while (true) {
		const elapsedMs = performance.now() - startedAt
		const progress = Math.min(1, elapsedMs / durationMs)
		const position = progress <= 0.5 ? progress * 2 : (1 - progress) * 2
		const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
		viewport.scrollTop = Math.round(maxScrollTop * position)
		viewport.dispatchEvent(new Event('scroll'))
		if (progress === 1) return
		await wait(Math.min(SCROLL_STEP_MS, Math.max(0, durationMs - elapsedMs)))
	}
}

async function drivePagingToExhaustion(
	root: HTMLElement,
	viewport: HTMLElement,
	getSnapshot: () => TaskBoardPerformancePagingSnapshot | undefined,
) {
	const startedAt = performance.now()
	let attempts = 0
	let observedError: string | null = null
	let retryButtonClickCount = 0
	while (getSnapshot()?.hasNextPage && attempts < 20) {
		const before = getSnapshot()
		if (!before) break
		attempts += 1
		if (before.state === 'error') {
			observedError ??= before.error
			await waitForPaint()
			const retryButton = root.querySelector<HTMLButtonElement>(
				'[data-task-board-sentinel-state="error"] button',
			)
			if (!retryButton) throw new Error('分页失败后未渲染 sentinel 重试按钮')
			retryButtonClickCount += 1
			retryButton.click()
		} else {
			viewport.scrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
			viewport.dispatchEvent(new Event('scroll'))
		}
		const progressed = await waitUntil(() => {
			const current = getSnapshot()
			return (
				current?.state === 'exhausted' ||
				current?.state !== before.state ||
				current?.fetchRequestCount !== before?.fetchRequestCount ||
				current?.tasks.length !== before?.tasks.length
			)
		}, 1_000)
		if (!progressed) break
		await waitUntil(() => getSnapshot()?.state !== 'loading', 1_000)
		await waitForPaint()
	}
	return {
		driveAttempts: attempts,
		durationMs: roundMs(performance.now() - startedAt),
		observedError,
		retryButtonClickCount,
	}
}

function observeTaskBoardDom(root: HTMLElement) {
	let mountCount = 0
	let unmountCount = 0
	let mountedRowPeak = countMountedRows(root)
	let domElementPeak = countDomElements(root)
	const processRecords = (records: MutationRecord[]) => {
		for (const record of records) {
			mountCount += countRows(record.addedNodes)
			unmountCount += countRows(record.removedNodes)
		}
		mountedRowPeak = Math.max(mountedRowPeak, countMountedRows(root))
		domElementPeak = Math.max(domElementPeak, countDomElements(root))
	}
	const observer = new MutationObserver(processRecords)
	observer.observe(root, { childList: true, subtree: true })

	return {
		read: (): RowObserverSnapshot => {
			processRecords(observer.takeRecords())
			return {
				mountedRows: countMountedRows(root),
				mountedRowPeak,
				mountCount,
				unmountCount,
				domElements: countDomElements(root),
				domElementPeak,
			}
		},
		disconnect: () => {
			processRecords(observer.takeRecords())
			observer.disconnect()
		},
	}
}

function countMountedRows(root: HTMLElement) {
	return root.querySelectorAll(ROW_SELECTOR).length
}

function countDomElements(root: HTMLElement) {
	return root.querySelectorAll('*').length
}

function countRows(nodes: NodeList) {
	let count = 0
	for (const node of nodes) {
		if (!(node instanceof Element)) continue
		if (node.matches(ROW_SELECTOR)) count += 1
		count += node.querySelectorAll(ROW_SELECTOR).length
	}
	return count
}

async function measureFocusSamples(taskIds: readonly string[]) {
	const samples: FocusSampleResult[] = []
	for (let index = 0; index < FOCUS_SAMPLE_COUNT; index += 1) {
		const taskIndex = Math.round((index / (FOCUS_SAMPLE_COUNT - 1)) * (taskIds.length - 1))
		const taskId = taskIds[taskIndex] ?? null
		if (!taskId) {
			samples.push({ index: index + 1, taskId, durationMs: null, succeeded: false })
			continue
		}

		const startedAt = performance.now()
		focusTaskBoardTaskId(taskId)
		const succeeded = await waitForFocusedTask(taskId)
		samples.push({
			index: index + 1,
			taskId,
			durationMs: succeeded ? roundMs(performance.now() - startedAt) : null,
			succeeded,
		})
	}
	return samples
}

async function measureKeyboardMoves(taskIds: readonly string[]) {
	const firstTaskId = taskIds[0]
	if (!firstTaskId || taskIds.length <= KEYBOARD_MOVE_COUNT) {
		throw new Error(`fixture 至少需要 ${KEYBOARD_MOVE_COUNT + 1} 个可导航任务`)
	}

	focusTaskBoardTaskId(firstTaskId)
	if (!(await waitForFocusedTask(firstTaskId))) {
		throw new Error('无法通过 TaskBoard focus bridge 聚焦键盘测量起点')
	}

	const keyboardMoves: KeyboardMoveResult[] = []
	for (let index = 0; index < KEYBOARD_MOVE_COUNT; index += 1) {
		const expectedTaskId = taskIds[index + 1]!
		const activeElement = document.activeElement
		const event = new KeyboardEvent('keydown', {
			key: 'j',
			code: 'KeyJ',
			bubbles: true,
			cancelable: true,
		})
		const startedAt = performance.now()
		if (activeElement instanceof HTMLElement) activeElement.dispatchEvent(event)
		const succeeded = await waitForFocusedTask(expectedTaskId)
		keyboardMoves.push({
			index: index + 1,
			fromTaskId: getFocusedTaskId(activeElement),
			expectedTaskId,
			actualTaskId: getFocusedTaskId(document.activeElement),
			durationMs: roundMs(performance.now() - startedAt),
			defaultPrevented: event.defaultPrevented,
			succeeded,
		})
		await wait(0)
	}
	return keyboardMoves
}

async function waitForFocusedTask(taskId: string) {
	return waitUntil(() => getFocusedTaskId(document.activeElement) === taskId, 500)
}

function getFocusedTaskId(element: Element | null) {
	return element instanceof HTMLElement ? (element.dataset.taskId ?? null) : null
}

function observeLongTasks() {
	const entryTypeSupported =
		typeof PerformanceObserver !== 'undefined' &&
		PerformanceObserver.supportedEntryTypes?.includes('longtask')
	const samples: Array<{ startTimeMs: number; durationMs: number }> = []
	const collect = (entries: PerformanceEntry[]) => {
		for (const entry of entries) {
			if (entry.duration < LONG_TASK_THRESHOLD_MS) continue
			samples.push({
				startTimeMs: roundMs(entry.startTime),
				durationMs: roundMs(entry.duration),
			})
		}
	}
	let observer: PerformanceObserver | null = null
	if (entryTypeSupported) {
		try {
			observer = new PerformanceObserver((list) => collect(list.getEntries()))
			observer.observe({ type: 'longtask' })
		} catch {
			observer = null
		}
	}
	const supported = observer !== null

	return {
		read: (): LongTaskEvidence => {
			if (observer) collect(observer.takeRecords())
			return {
				supported,
				thresholdMs: LONG_TASK_THRESHOLD_MS,
				samples: supported ? [...samples] : null,
			}
		},
		disconnect: () => observer?.disconnect(),
	}
}

async function waitUntil(predicate: () => boolean, timeoutMs: number) {
	const deadline = performance.now() + timeoutMs
	while (performance.now() < deadline) {
		if (predicate()) return true
		await wait(8)
	}
	return predicate()
}

async function waitForPaint() {
	await new Promise<void>((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
	)
}

function wait(durationMs: number) {
	return new Promise<void>((resolve) => window.setTimeout(resolve, durationMs))
}

function roundMs(value: number) {
	return Math.round(value * 100) / 100
}
