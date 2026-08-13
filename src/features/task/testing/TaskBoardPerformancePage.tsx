import { useCallback, useMemo, useRef, useState } from 'react'

import { BulkActionProvider, type BulkAction } from '@/features/bulk-action'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import { AppScrollArea } from '@/shared/components/AppScrollArea'
import type { TaskListItem } from '@/shared/types'

import { TaskBoard } from '../components/TaskBoard'
import { scrollTaskBoardToTaskId } from '../components/taskBoardScroll'
import { TaskPreviewProvider } from '../detail/model/TaskPreviewProvider'
import {
	createGroupedTaskBoardPerformanceFixture,
	createPagedTaskBoardPerformanceFixture,
} from './taskBoardPerformanceFixtures'

const SCROLL_RUN_COUNT = 5
const SCROLL_RUN_DURATION_MS = 5_000
const WARMUP_DURATION_MS = 1_000
const FOCUS_SAMPLE_COUNT = 50
const SCROLL_STEP_MS = 50
const ROW_SELECTOR = '[data-task-id]'
const EMPTY_SELECTED_TASK_IDS = new Set<string>()
const EMPTY_BULK_ACTIONS: BulkAction[] = []

type FixtureKey = 'grouped' | 'paged'

type ScrollRunResult = {
	durationMs: number
	mountedRowPeak: number
	mountCount: number
	unmountCount: number
}

type TaskBoardScenarioResult = {
	fixture: FixtureKey
	seed: number
	loadedCount: number
	totalCount: number
	hasNextPage: boolean
	warmupCount: number
	scrollRuns: ScrollRunResult[]
	fetchRequestsBeforeMeasurement: number
	fetchRequestsDuringMeasurement: number
	duplicateFetchCount: number
	focusSamplesMs: Array<number | null>
}

type TaskBoardBenchmarkReport = {
	schemaVersion: 1
	generatedAt: string
	buildMode: 'production'
	viewport: { width: number; height: number; devicePixelRatio: number }
	userAgent: string
	hardwareConcurrency: number | null
	commit: string
	device: string
	os: string
	webview: string
	cpu: string
	memory: string
	results: TaskBoardScenarioResult[]
}

const noop = () => undefined
const noopAsync = async () => undefined

export function TaskBoardPerformancePage() {
	const [fixtureKey, setFixtureKey] = useState<FixtureKey>('grouped')
	const [commit, setCommit] = useState(import.meta.env.VITE_BENCHMARK_COMMIT ?? '')
	const [device, setDevice] = useState('')
	const [os, setOs] = useState('')
	const [webview, setWebview] = useState('')
	const [cpu, setCpu] = useState('')
	const [memory, setMemory] = useState('')
	const [results, setResults] = useState<TaskBoardScenarioResult[]>([])
	const [status, setStatus] = useState('等待测量')
	const [running, setRunning] = useState(false)
	const [isFetchingNextPage, setIsFetchingNextPage] = useState(false)
	const boardHostRef = useRef<HTMLDivElement>(null)
	const viewportRef = useRef<HTMLDivElement>(null)
	const fetchRequestsRef = useRef(0)
	const duplicateFetchRequestsRef = useRef(0)
	const fetchInFlightRef = useRef(false)
	const handleFetchNextPage = useCallback(() => {
		if (fetchInFlightRef.current) {
			duplicateFetchRequestsRef.current += 1
			return
		}
		fetchInFlightRef.current = true
		fetchRequestsRef.current += 1
		setIsFetchingNextPage(true)
	}, [])

	const fixture = useMemo(
		() =>
			fixtureKey === 'grouped'
				? createGroupedTaskBoardPerformanceFixture()
				: createPagedTaskBoardPerformanceFixture(),
		[fixtureKey],
	)

	const report = useMemo<TaskBoardBenchmarkReport>(
		() => ({
			schemaVersion: 1,
			generatedAt: new Date().toISOString(),
			buildMode: 'production',
			viewport: {
				width: window.innerWidth,
				height: window.innerHeight,
				devicePixelRatio: window.devicePixelRatio,
			},
			userAgent: navigator.userAgent,
			hardwareConcurrency: navigator.hardwareConcurrency || null,
			commit,
			device,
			os,
			webview,
			cpu,
			memory,
			results,
		}),
		[commit, cpu, device, memory, os, results, webview],
	)

	async function runBenchmark() {
		const boardHost = boardHostRef.current
		const viewport = viewportRef.current
		if (!boardHost || !viewport || running) return

		setRunning(true)
		setStatus(`正在预热 ${fixtureKey}…`)
		fetchRequestsRef.current = 0
		duplicateFetchRequestsRef.current = 0
		fetchInFlightRef.current = false
		setIsFetchingNextPage(false)

		try {
			await wait(0)
			await driveScroll(viewport, WARMUP_DURATION_MS)

			const fetchRequestsBeforeMeasurement = fetchRequestsRef.current
			const scrollRuns: ScrollRunResult[] = []

			for (let index = 0; index < SCROLL_RUN_COUNT; index += 1) {
				setStatus(`正在滚动 ${fixtureKey}：${index + 1}/${SCROLL_RUN_COUNT}`)
				const rowObserver = observeTaskRows(boardHost)
				const startedAt = performance.now()

				await driveScroll(viewport, SCROLL_RUN_DURATION_MS)
				await wait(0)

				const counts = rowObserver.read()
				rowObserver.disconnect()
				scrollRuns.push({
					durationMs: roundMs(performance.now() - startedAt),
					...counts,
				})
			}

			setStatus(`正在测量 ${FOCUS_SAMPLE_COUNT} 次焦点恢复…`)
			const focusSamplesMs = await measureFocusSamples(fixture.tasks)
			const fetchRequestsDuringMeasurement =
				fetchRequestsRef.current - fetchRequestsBeforeMeasurement
			const nextResult: TaskBoardScenarioResult = {
				fixture: fixtureKey,
				seed: fixture.seed,
				loadedCount: fixture.loadedCount,
				totalCount: fixture.totalCount,
				hasNextPage: fixture.hasNextPage,
				warmupCount: 1,
				scrollRuns,
				fetchRequestsBeforeMeasurement,
				fetchRequestsDuringMeasurement,
				duplicateFetchCount: duplicateFetchRequestsRef.current,
				focusSamplesMs,
			}

			setResults((current) => [
				...current.filter((result) => result.fixture !== fixtureKey),
				nextResult,
			])
			setStatus(`${fixtureKey} 测量完成`)
		} catch (error) {
			setStatus(error instanceof Error ? error.message : String(error))
		} finally {
			setRunning(false)
		}
	}

	function handleFixtureChange(nextFixture: FixtureKey) {
		if (running) return
		fetchRequestsRef.current = 0
		duplicateFetchRequestsRef.current = 0
		fetchInFlightRef.current = false
		setIsFetchingNextPage(false)
		setFixtureKey(nextFixture)
	}

	return (
		<DangerConfirmProvider>
			<TaskPreviewProvider>
				<BulkActionProvider actions={EMPTY_BULK_ACTIONS}>
					<main className='flex h-screen min-h-0 flex-col bg-background text-foreground'>
						<header className='grid gap-3 border-b border-border px-4 py-3'>
							<div className='flex flex-wrap items-center gap-3'>
								<h1 className='mr-auto text-sm font-semibold'>TaskBoard 性能基线</h1>
								<label className='flex items-center gap-2 text-xs'>
									Fixture
									<select
										aria-label='性能 fixture'
										disabled={running}
										value={fixtureKey}
										onChange={(event) => handleFixtureChange(event.target.value as FixtureKey)}
									>
										<option value='grouped'>2,000 / 20×100</option>
										<option value='paged'>200 loaded / 10,000 total</option>
									</select>
								</label>
								<button disabled={running} onClick={() => void runBenchmark()} type='button'>
									{running ? '测量中…' : '运行当前 fixture'}
								</button>
								<span aria-live='polite' className='text-xs' role='status'>
									{status}
								</span>
							</div>
							<div className='grid grid-cols-2 gap-2 md:grid-cols-6'>
								<MetadataInput label='Commit' value={commit} onChange={setCommit} />
								<MetadataInput label='设备' value={device} onChange={setDevice} />
								<MetadataInput label='OS' value={os} onChange={setOs} />
								<MetadataInput label='WebView' value={webview} onChange={setWebview} />
								<MetadataInput label='CPU' value={cpu} onChange={setCpu} />
								<MetadataInput label='内存' value={memory} onChange={setMemory} />
							</div>
						</header>

						<div className='grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px]'>
							<div className='min-h-0' ref={boardHostRef}>
								<AppScrollArea
									className='h-full'
									ref={viewportRef}
									scrollContainerRole='main-card'
									viewportClassName='px-2 pb-2'
								>
									<TaskBoard
										activeTaskId={null}
										customSections={fixture.customSections}
										hasNextPage={fixture.hasNextPage}
										isFetchingNextPage={isFetchingNextPage}
										loadedCount={fixture.loadedCount}
										onEmptyAction={noop}
										onFetchNextPage={handleFetchNextPage}
										onOpenTask={noop}
										onToggleTaskSelection={noop}
										onToggleTaskStatus={noopAsync}
										onUpdateTaskPriority={noopAsync}
										onUpdateTaskStatus={noopAsync}
										pendingTaskId={null}
										selectedTaskIdSet={EMPTY_SELECTED_TASK_IDS}
										showProjectCellOptions={false}
										status='ready'
										tasks={fixture.tasks}
										totalCount={fixture.totalCount}
									/>
								</AppScrollArea>
							</div>

							<textarea
								aria-label='性能测量 JSON'
								className='h-full resize-none border-l border-border bg-card p-3 font-mono text-xs'
								readOnly
								value={JSON.stringify(report, null, 2)}
							/>
						</div>
					</main>
				</BulkActionProvider>
			</TaskPreviewProvider>
		</DangerConfirmProvider>
	)
}

function MetadataInput({
	label,
	value,
	onChange,
}: {
	label: string
	value: string
	onChange: (value: string) => void
}) {
	return (
		<label className='grid gap-1 text-xs'>
			{label}
			<input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
		</label>
	)
}

async function driveScroll(viewport: HTMLElement, durationMs: number) {
	const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
	const startedAt = performance.now()

	while (true) {
		const elapsedMs = performance.now() - startedAt
		const progress = Math.min(1, elapsedMs / durationMs)
		const position = progress <= 0.5 ? progress * 2 : (1 - progress) * 2
		viewport.scrollTop = Math.round(maxScrollTop * position)
		viewport.dispatchEvent(new Event('scroll'))
		if (progress === 1) return
		await wait(Math.min(SCROLL_STEP_MS, durationMs - elapsedMs))
	}
}

function observeTaskRows(root: HTMLElement) {
	let mountCount = 0
	let unmountCount = 0
	let mountedRowPeak = root.querySelectorAll(ROW_SELECTOR).length
	const observer = new MutationObserver((records) => {
		for (const record of records) {
			mountCount += countRows(record.addedNodes)
			unmountCount += countRows(record.removedNodes)
		}
		mountedRowPeak = Math.max(mountedRowPeak, root.querySelectorAll(ROW_SELECTOR).length)
	})

	observer.observe(root, { childList: true, subtree: true })

	return {
		read: () => ({ mountedRowPeak, mountCount, unmountCount }),
		disconnect: () => observer.disconnect(),
	}
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

async function measureFocusSamples(tasks: readonly TaskListItem[]) {
	const samples: Array<number | null> = []
	for (let index = 0; index < FOCUS_SAMPLE_COUNT; index += 1) {
		const taskIndex = Math.round((index / (FOCUS_SAMPLE_COUNT - 1)) * (tasks.length - 1))
		const task = tasks[taskIndex]
		if (!task) {
			samples.push(null)
			continue
		}

		const startedAt = performance.now()
		scrollTaskBoardToTaskId(task.id)
		const row = await waitForTaskRow(task.id)
		if (!row) {
			samples.push(null)
			continue
		}

		row.focus({ preventScroll: true })
		samples.push(document.activeElement === row ? roundMs(performance.now() - startedAt) : null)
	}
	return samples
}

async function waitForTaskRow(taskId: string) {
	const deadline = performance.now() + 500
	while (performance.now() < deadline) {
		const row = document.querySelector<HTMLElement>(`[data-task-id="${taskId}"]`)
		if (row) return row
		await wait(8)
	}
	return null
}

function wait(durationMs: number) {
	return new Promise<void>((resolve) => window.setTimeout(resolve, durationMs))
}

function roundMs(value: number) {
	return Math.round(value * 100) / 100
}
