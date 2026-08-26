import { useEffect, useRef, useState } from 'react'

import { EmptyState } from '@heroui-pro/react'
import {
	Alert,
	Button,
	FieldError,
	Input,
	Label,
	ProgressBar,
	SearchField,
	Skeleton,
	Spinner,
	TextField,
	Toast,
	ToastQueue,
} from '@heroui/react'
import {
	AlertTriangleIcon,
	CheckCircle2Icon,
	CircleAlertIcon,
	InfoIcon,
	PlusIcon,
	SearchXIcon,
} from 'lucide-react'

import type { UiLabSample } from '../../uiLabCatalog'

type RecoveryState = 'empty' | 'error' | 'ready'

function EmptyErrorRecoveryPreview() {
	const [state, setState] = useState<RecoveryState>('empty')
	const recoveryControlRef = useRef<HTMLButtonElement>(null)

	useEffect(() => {
		if (state === 'ready') recoveryControlRef.current?.focus()
	}, [state])

	return (
		<div className='w-full max-w-2xl space-y-4'>
			<div aria-label='空状态与错误状态控制' className='flex flex-wrap gap-2' role='group'>
				<Button
					ref={recoveryControlRef}
					onPress={() => setState('empty')}
					type='button'
					variant='outline'
				>
					显示空状态
				</Button>
				<Button onPress={() => setState('error')} type='button' variant='outline'>
					模拟加载失败
				</Button>
			</div>

			{state === 'empty' ? (
				<div className='rounded-2xl border border-dashed border-border'>
					<EmptyState>
						<EmptyState.Header>
							<EmptyState.Media variant='icon'>
								<SearchXIcon aria-hidden className='size-5' />
							</EmptyState.Media>
							<EmptyState.Title>这里还没有任务</EmptyState.Title>
							<EmptyState.Description>
								创建一条本地演示任务，检查空状态是否给出清楚且可执行的下一步。
							</EmptyState.Description>
						</EmptyState.Header>
						<EmptyState.Content>
							<Button onPress={() => setState('ready')} type='button' variant='primary'>
								<PlusIcon aria-hidden className='size-4' />
								创建演示任务
							</Button>
						</EmptyState.Content>
					</EmptyState>
				</div>
			) : null}

			{state === 'error' ? (
				<Alert role='alert' status='danger'>
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>任务列表加载失败</Alert.Title>
						<Alert.Description>
							这是本地 fixture 错误，不会发起网络请求；可以立即重试恢复。
						</Alert.Description>
					</Alert.Content>
					<Button onPress={() => setState('ready')} type='button' variant='danger'>
						重试
					</Button>
				</Alert>
			) : null}

			{state === 'ready' ? (
				<Alert status='success'>
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>已在本地恢复</Alert.Title>
						<Alert.Description>
							没有创建真实任务，也没有写入 Store、数据库或 Tauri。
						</Alert.Description>
					</Alert.Content>
				</Alert>
			) : null}

			<p aria-live='polite' className='min-h-5 text-sm text-muted' role='status'>
				{state === 'ready' ? '恢复完成：已回到本地演示状态；焦点已返回状态控制。' : null}
			</p>
		</div>
	)
}

function LoadingFeedbackPreview() {
	const [progress, setProgress] = useState(48)

	return (
		<div className='grid w-full max-w-5xl gap-4 lg:grid-cols-3'>
			<section
				aria-busy='true'
				aria-labelledby='feedback-skeleton-heading'
				className='rounded-lg border border-border p-4'
			>
				<h3 className='text-sm font-semibold' id='feedback-skeleton-heading'>
					Skeleton · 首次加载结构
				</h3>
				<p className='mt-1 text-xs leading-5 text-muted'>
					用于内容形状已知、数据尚未返回的任务列表。
				</p>
				<div aria-hidden className='mt-4 space-y-3'>
					{[0, 1, 2].map((item) => (
						<div className='flex items-center gap-3' key={item}>
							<Skeleton className='size-8 shrink-0' />
							<div className='flex-1 space-y-2'>
								<Skeleton className='h-3 w-4/5' />
								<Skeleton className='h-3 w-2/5' />
							</div>
						</div>
					))}
				</div>
			</section>

			<section
				aria-labelledby='feedback-spinner-heading'
				className='rounded-lg border border-border p-4'
			>
				<h3 className='text-sm font-semibold' id='feedback-spinner-heading'>
					Spinner · 短时动作
				</h3>
				<p className='mt-1 text-xs leading-5 text-muted'>
					保留“保存”标签，不让旋转图形独自承担含义。
				</p>
				<Button className='mt-4' isPending type='button' variant='secondary'>
					<Spinner aria-hidden color='current' size='sm' />
					正在保存
				</Button>
			</section>

			<section
				aria-labelledby='feedback-progress-heading'
				className='space-y-5 rounded-lg border border-border p-4'
			>
				<div>
					<h3 className='text-sm font-semibold' id='feedback-progress-heading'>
						Progress · 可估算与不可估算
					</h3>
					<p className='mt-1 text-xs leading-5 text-muted'>
						批量导入显示确定进度；等待远端确认时不虚构百分比。
					</p>
				</div>
				<ProgressBar value={progress}>
					<Label>批量导入任务</Label>
					<ProgressBar.Output />
					<ProgressBar.Track>
						<ProgressBar.Fill />
					</ProgressBar.Track>
				</ProgressBar>
				<Button
					onPress={() => setProgress((value) => (value >= 100 ? 20 : Math.min(100, value + 20)))}
					size='sm'
					type='button'
					variant='outline'
				>
					推进 20%
				</Button>
				<ProgressBar isIndeterminate>
					<Label>等待远端确认</Label>
					<ProgressBar.Track>
						<ProgressBar.Fill />
					</ProgressBar.Track>
				</ProgressBar>
			</section>
		</div>
	)
}

const FEEDBACK_VARIANTS = [
	{
		id: 'info',
		label: '信息',
		status: 'accent',
		title: '工作区有可用更新',
		description: '这是中性信息，不应打断当前输入。',
	},
	{
		id: 'success',
		label: '成功',
		status: 'success',
		title: '视图已保存',
		description: '操作已经完成，可以继续工作。',
	},
	{
		id: 'warning',
		label: '警告',
		status: 'warning',
		title: '离线修改尚未同步',
		description: '内容仍保留，但关闭应用前需要留意同步状态。',
	},
	{
		id: 'danger',
		label: '错误',
		status: 'danger',
		title: '保存失败',
		description: '演示错误可重试；没有数据被丢弃。',
	},
] as const

function AlertToastPreview() {
	const [variantId, setVariantId] = useState<(typeof FEEDBACK_VARIANTS)[number]['id']>('info')
	const [queue] = useState(() => new ToastQueue({ maxVisibleToasts: 1 }))
	const selected = FEEDBACK_VARIANTS.find((item) => item.id === variantId)!

	useEffect(
		() => () => {
			queue.clear()
		},
		[queue],
	)

	function showToast() {
		queue.clear()
		queue.add(
			{
				actionProps: {
					children: '关闭提示',
					onPress: () => queue.clear(),
					variant: 'tertiary',
				},
				description: selected.description,
				title: `Toast · ${selected.title}`,
				variant: selected.status,
			},
			{ timeout: 0 },
		)
	}

	return (
		<div className='w-full max-w-3xl space-y-5'>
			<Toast.Provider placement='bottom end' queue={queue} />
			<div aria-label='反馈层级' className='flex flex-wrap gap-2' role='group'>
				{FEEDBACK_VARIANTS.map((item) => (
					<Button
						aria-pressed={item.id === variantId}
						key={item.id}
						onPress={() => setVariantId(item.id)}
						type='button'
						variant={item.id === variantId ? 'secondary' : 'ghost'}
					>
						{item.label}
					</Button>
				))}
			</div>

			<Alert role={selected.id === 'danger' ? 'alert' : 'status'} status={selected.status}>
				<Alert.Indicator />
				<Alert.Content>
					<Alert.Title>{selected.title}</Alert.Title>
					<Alert.Description>{selected.description}</Alert.Description>
				</Alert.Content>
			</Alert>

			<div className='flex flex-wrap items-center gap-3'>
				<Button onPress={showToast} type='button' variant='outline'>
					触发当前 Toast
				</Button>
				<p className='text-xs leading-5 text-muted'>
					Toast 保持到主动关闭；可关闭后再次触发，切换样例会清空其私有队列。
				</p>
			</div>
		</div>
	)
}

type SaveState = 'idle' | 'pending' | 'saved' | 'error'

function SemanticFeedbackPreview() {
	const [saveState, setSaveState] = useState<SaveState>('idle')
	const [dangerMessage, setDangerMessage] = useState('')

	return (
		<div className='grid w-full max-w-5xl gap-5 lg:grid-cols-2'>
			<section aria-labelledby='feedback-field-heading' className='space-y-4 rounded-lg border p-4'>
				<h3 className='text-sm font-semibold' id='feedback-field-heading'>
					Disabled 与 Invalid
				</h3>
				<TextField fullWidth isInvalid isRequired name='feedback-required-title'>
					<Label>任务标题（必填）</Label>
					<Input />
					<FieldError>请输入任务标题；错误不只通过边框颜色表达。</FieldError>
				</TextField>
				<div>
					<Button aria-describedby='feedback-disabled-reason' isDisabled type='button'>
						发布工作区
					</Button>
					<p className='mt-2 text-xs text-muted' id='feedback-disabled-reason'>
						需要先完成同步；原生禁用按钮会退出 Tab 顺序，原因因此常驻显示。
					</p>
				</div>
			</section>

			<section aria-labelledby='feedback-save-heading' className='space-y-4 rounded-lg border p-4'>
				<h3 className='text-sm font-semibold' id='feedback-save-heading'>
					Save、Pending、Error 与 Retry
				</h3>
				<div className='flex flex-wrap gap-2'>
					<Button
						isPending={saveState === 'pending'}
						onPress={() => setSaveState('pending')}
						type='button'
						variant='primary'
					>
						{saveState === 'pending' ? <Spinner aria-hidden color='current' size='sm' /> : null}
						保存
					</Button>
					{saveState === 'pending' ? (
						<>
							<Button onPress={() => setSaveState('saved')} type='button' variant='outline'>
								模拟成功
							</Button>
							<Button onPress={() => setSaveState('error')} type='button' variant='danger-soft'>
								模拟错误
							</Button>
						</>
					) : null}
				</div>

				{saveState === 'error' ? (
					<Alert role='alert' status='danger'>
						<Alert.Indicator />
						<Alert.Content>
							<Alert.Title>保存失败</Alert.Title>
							<Alert.Description>本地 fixture 保留输入，可立即重试。</Alert.Description>
						</Alert.Content>
						<Button onPress={() => setSaveState('saved')} type='button' variant='danger'>
							重试保存
						</Button>
					</Alert>
				) : null}

				<p aria-live='polite' className='min-h-5 text-sm text-muted' role='status'>
					{saveState === 'pending' ? '保存演示正在等待结果。' : null}
					{saveState === 'saved' ? '已保存本地演示状态；刷新后不会保留。' : null}
				</p>

				<div className='border-t border-separator pt-4'>
					<Button
						onPress={() => setDangerMessage('已模拟危险操作；没有删除任何数据。')}
						type='button'
						variant='danger'
					>
						删除全部演示数据
					</Button>
					<p aria-live='polite' className='mt-2 text-xs text-muted' role='status'>
						{dangerMessage || 'Danger 通过文字、图标语义和按钮标签共同表达。'}
					</p>
				</div>
			</section>
		</div>
	)
}

const INITIAL_LAUNCHER_TASKS = [
	'整理 UI Lab 中所有反馈组件的责任边界与真实应用验收路径',
	'复查跨窗口状态同步失败后是否保留尚未提交的长中文任务标题',
] as const

function LauncherLifecyclePreview() {
	const [query, setQuery] = useState('')
	const [createdTask, setCreatedTask] = useState('')
	const [hasError, setHasError] = useState(false)
	const [message, setMessage] = useState('')
	const errorControlRef = useRef<HTMLButtonElement>(null)
	const shouldRestoreErrorControl = useRef(false)
	const normalizedQuery = query.trim().toLocaleLowerCase()
	const tasks = createdTask ? [createdTask, ...INITIAL_LAUNCHER_TASKS] : INITIAL_LAUNCHER_TASKS
	const results = tasks.filter((task) => task.toLocaleLowerCase().includes(normalizedQuery))

	useEffect(() => {
		if (!hasError && shouldRestoreErrorControl.current) {
			shouldRestoreErrorControl.current = false
			errorControlRef.current?.focus()
		}
	}, [hasError])

	function createFixtureTask() {
		const title = query.trim() || '快速记录一条本地演示任务'
		setCreatedTask(title)
		setQuery('')
		setHasError(false)
		setMessage(`已在 fixture 中创建：${title}`)
	}

	function retrySearch() {
		shouldRestoreErrorControl.current = true
		setHasError(false)
		setMessage('搜索已恢复；已重新显示本地任务结果。')
	}

	return (
		<div className='w-full max-w-[34rem] space-y-4'>
			<section aria-label='Launcher 可移植界面' className='rounded-xl border bg-surface p-3'>
				<div className='flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end'>
					<SearchField
						fullWidth
						name='launcher-fixture-search'
						onChange={(value) => {
							setQuery(value)
							setHasError(false)
						}}
						onClear={() => setQuery('')}
						value={query}
						variant='secondary'
					>
						<Label>搜索或创建任务</Label>
						<SearchField.Group>
							<SearchField.SearchIcon />
							<SearchField.Input placeholder='输入任务标题' />
							<SearchField.ClearButton aria-label='清空 Launcher 搜索' />
						</SearchField.Group>
					</SearchField>
					<Button onPress={createFixtureTask} type='button' variant='primary'>
						<PlusIcon aria-hidden className='size-4' />
						创建
					</Button>
				</div>

				<div className='mt-3 flex flex-wrap items-center gap-2'>
					<Button
						ref={errorControlRef}
						onPress={() => {
							setHasError(true)
							setMessage('')
						}}
						size='sm'
						type='button'
						variant='outline'
					>
						<AlertTriangleIcon aria-hidden className='size-4' />
						模拟搜索错误
					</Button>
					<p aria-live='polite' className='min-h-5 text-xs text-muted' role='status'>
						{message}
					</p>
				</div>

				<div className='mt-4 border-t border-separator pt-4'>
					{hasError ? (
						<Alert role='alert' status='danger'>
							<Alert.Indicator>
								<CircleAlertIcon aria-hidden className='size-5' />
							</Alert.Indicator>
							<Alert.Content>
								<Alert.Title>Launcher 搜索失败</Alert.Title>
								<Alert.Description>模拟状态没有调用搜索 API，也不会关闭窗口。</Alert.Description>
							</Alert.Content>
							<Button onPress={retrySearch} type='button' variant='danger'>
								重试搜索
							</Button>
						</Alert>
					) : results.length > 0 ? (
						<div>
							<div className='flex items-center gap-2 text-xs font-medium text-muted'>
								<CheckCircle2Icon aria-hidden className='size-4' />
								<span>{normalizedQuery ? `找到 ${results.length} 条` : '最近任务'}</span>
							</div>
							<ul aria-label='Launcher 任务结果' className='mt-2 divide-y divide-separator'>
								{results.map((task) => (
									<li className='min-w-0 py-3 text-sm leading-6' key={task}>
										{task}
									</li>
								))}
							</ul>
						</div>
					) : (
						<EmptyState size='sm'>
							<EmptyState.Header>
								<EmptyState.Media variant='icon'>
									<InfoIcon aria-hidden className='size-4' />
								</EmptyState.Media>
								<EmptyState.Title>没有匹配的任务</EmptyState.Title>
								<EmptyState.Description>
									可以直接用当前查询创建一条本地 fixture 任务。
								</EmptyState.Description>
							</EmptyState.Header>
							<EmptyState.Content>
								<Button onPress={createFixtureTask} size='sm' type='button' variant='secondary'>
									创建“{query}”
								</Button>
							</EmptyState.Content>
						</EmptyState>
					)}
				</div>
			</section>

			<aside className='rounded-lg border border-dashed border-border p-3 text-xs leading-5 text-muted'>
				<strong className='font-medium text-foreground'>仅真实应用验证：</strong>
				原生窗口激活、全局快捷键、真实创建流程、WebView 边界和跨窗口状态同步。Lab
				只审查可移植的搜索、创建、空态、错误与恢复界面。
			</aside>
		</div>
	)
}

export const TICKET_06_SAMPLES = [
	{
		id: 'stoneflow-empty-error-recovery',
		name: 'Empty / Error / Retry',
		view: 'stoneflow',
		category: 'Feedback',
		description: '用真实 EmptyState 与 Alert 审查空状态下一步、错误说明和无副作用恢复动作。',
		keywords: ['empty', 'error', 'retry', '空状态', '错误', '重试', '恢复'],
		owner: 'UI Lab fixture',
		source:
			'src/ui-lab/samples/ticket-06/feedbackLauncherSamples.tsx；@heroui/react@3.2.4；@heroui-pro/react@1.0.0-beta.8',
		coverage: 'rendered',
		states: 'Empty、Error、Retry、Recovered',
		verification: 'Lab 可验证；真实数据恢复仅真实应用验证',
		Preview: EmptyErrorRecoveryPreview,
	},
	{
		id: 'stoneflow-loading-feedback',
		name: 'Skeleton / Spinner / Progress',
		view: 'stoneflow',
		category: 'Feedback',
		description: '分别检查结构加载、短时动作、确定与不确定进度，不在同一任务上堆叠提示。',
		keywords: ['skeleton', 'spinner', 'progress', 'loading', 'pending', '加载', '进度'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Skeleton、Pending、Determinate、Indeterminate、Reduced Motion',
		verification: 'Lab 可验证；真实耗时与 WebView 动画仅真实应用验证',
		Preview: LoadingFeedbackPreview,
	},
	{
		id: 'stoneflow-alert-toast',
		name: 'Alert / Toast',
		view: 'stoneflow',
		category: 'Feedback',
		description:
			'触发信息、成功、警告与错误层级；Toast 使用可关闭且随预览卸载清空的 HeroUI 私有队列。',
		keywords: ['alert', 'toast', '信息', '成功', '警告', '错误', '关闭', '重触发'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Info、Success、Warning、Error、Open、Dismissed、Retriggered',
		verification: 'Lab 可验证；目标屏幕阅读器公告仍需真实应用验证',
		Preview: AlertToastPreview,
	},
	{
		id: 'stoneflow-semantic-feedback',
		name: 'Disabled / Invalid / Danger / Save',
		view: 'stoneflow',
		category: 'Feedback',
		description: '用文字、原生状态和真实组件检查禁用、无效、危险、保存、失败与重试的非颜色路径。',
		keywords: ['disabled', 'invalid', 'danger', 'save', 'pending', 'error', 'retry', '禁用'],
		owner: 'UI Lab fixture',
		source: 'src/ui-lab/samples/ticket-06/feedbackLauncherSamples.tsx；@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Disabled、Invalid、Danger、Save、Pending、Error、Retry、Saved',
		verification: 'Lab 可验证；真实写入与失败恢复仅真实应用验证',
		Preview: SemanticFeedbackPreview,
	},
	{
		id: 'stoneflow-launcher-lifecycle',
		name: 'Launcher：搜索、创建与恢复',
		view: 'stoneflow',
		category: 'Product Scenes',
		description:
			'最小无副作用 Launcher fixture，用长中文和窄容器审查搜索、创建、空态、错误与恢复。',
		keywords: ['launcher', '搜索', '创建', '空状态', '错误', '恢复', '跨窗口', '长中文'],
		owner: 'Launcher feature',
		source: 'src/launcher.tsx；src/ui-lab/samples/ticket-06/feedbackLauncherSamples.tsx',
		coverage: 'rendered',
		states: 'Search、Create、Empty、Error、Retry、Long Copy、Narrow',
		verification:
			'Lab 可验证可移植界面；窗口、快捷键、真实创建、WebView 与跨窗口状态仅真实应用验证',
		Preview: LauncherLifecyclePreview,
	},
] as const satisfies readonly UiLabSample[]
