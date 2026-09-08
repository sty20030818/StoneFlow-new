import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterContextProvider,
	useLocation,
} from '@tanstack/react-router'
import { clearMocks, mockIPC } from '@tauri-apps/api/mocks'

import {
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
} from '@/features/command'
import type { ProjectOption } from '@/features/project'
import { useDialogStore } from '@/features/shell-dialogs'
import { SubmitRegistryProvider } from '@/features/submit'
import { useShellCreateDialogState } from '@/layout/model/useShellCreateDialogState'
import { ShellCreationOverlays } from '@/layout/overlays/ShellCreationOverlays'
import { useLatestRef } from '@/shared/lib/useLatestRef'
import type { CreateTaskInput, Scope, Space, TaskDetail } from '@/shared/types'

import type { UiLabReviewUnitInput } from '../uiLabCatalog'

const scope: Scope = { type: 'space', spaceId: 'space-work' }
const spaces: Space[] = [
	{ id: 'space-work', name: '工作', iconKey: 'folder', colorKey: 'blue', isDefault: true },
	{ id: 'space-life', name: '生活', iconKey: 'home', colorKey: 'green', isDefault: false },
].map((space, position) => ({
	...space,
	position,
	archivedAt: null,
	deletedAt: null,
	createdAt: '2026-09-08T08:00:00.000Z',
	updatedAt: '2026-09-08T08:00:00.000Z',
}))
const projects: ProjectOption[] = [
	{ id: 'project-work', spaceId: 'space-work', name: '网站改版' },
	{ id: 'project-life', spaceId: 'space-life', name: '周末旅行' },
]
const shortcuts = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

function createPreviewSession() {
	return {
		queryClient: new QueryClient({
			defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
		}),
		router: createRouter({
			routeTree: createRootRoute(),
			history: createMemoryHistory({ initialEntries: ['/space-work/tasks'] }),
			defaultNotFoundComponent: () => null,
		}),
	}
}

/** 仅浏览器运行；生产组件与写入函数不替换，只隔离最终 IPC 边界。 */
function CreateDialogPreview() {
	const [session, setSession] = useState<
		(ReturnType<typeof createPreviewSession> & { dispose: () => void }) | null
	>(null)
	const [blocked, setBlocked] = useState(
		() => '__TAURI_INTERNALS__' in window || '__TAURI_EVENT_PLUGIN_INTERNALS__' in window,
	)
	const [failNext, setFailNext] = useState(false)
	const [slow, setSlow] = useState(false)
	const [result, setResult] = useState('尚未创建；所有写入仅保存在本样例内存中。')
	const options = useLatestRef({ failNext, slow })

	useEffect(() => () => session?.dispose(), [session])

	function startPreview() {
		if ('__TAURI_INTERNALS__' in window || '__TAURI_EVENT_PLUGIN_INTERNALS__' in window) {
			setBlocked(true)
			return
		}
		const preview = createPreviewSession()
		let active = true
		let sequence = 0
		const pending = new Map<ReturnType<typeof setTimeout>, () => void>()
		useDialogStore.setState(useDialogStore.getInitialState())
		mockIPC(async (command, payload) => {
			if (!active) throw new Error('样例会话已结束')
			const input = (payload as { input?: Record<string, unknown> } | undefined)?.input
			if (command !== 'create_task' && command !== 'create_project') {
				throw new Error(`样例未开放 IPC：${command}`)
			}
			if (!input) throw new Error('样例创建请求缺少 input')
			const shouldFail = options.current.failNext
			if (shouldFail) setFailNext(false)
			if (options.current.slow) {
				await new Promise<void>((resolve, reject) => {
					const timer = setTimeout(() => {
						pending.delete(timer)
						resolve()
					}, 1200)
					pending.set(timer, () => reject(new Error('样例会话已结束')))
				})
			}
			if (!active) throw new Error('样例会话已结束')
			if (shouldFail) {
				setResult('已模拟一次写入失败；可在弹窗中使用原输入重试。')
				throw new Error('Lab 模拟保存失败，请重试')
			}
			const taskInput = input as unknown as CreateTaskInput
			const placement = command === 'create_task' ? taskInput.placement : null
			const project =
				placement?.kind === 'project'
					? projects.find((entry) => entry.id === placement.projectId)
					: null
			const space = spaces.find((entry) => entry.id === (project?.spaceId ?? input.spaceId))
			if (!space) throw new Error('样例创建目标 Space 无效')
			const id = `preview-${++sequence}`
			const now = new Date().toISOString()
			const common = {
				id,
				spaceId: space.id,
				spaceName: space.name,
				status: 'todo' as const,
				priority: 0 as const,
				dueAt: null,
				plannedAt: null,
				remindAt: null,
				completedAt: null,
				archivedAt: null,
				deletedAt: null,
				position: sequence,
				createdAt: now,
				updatedAt: now,
				statusChangedAt: now,
			}
			if (command === 'create_task') {
				const task: TaskDetail = {
					...common,
					spaceSlug: space.id,
					projectId: project?.id ?? null,
					projectName: project?.name ?? null,
					title: taskInput.title,
					note: taskInput.note ?? null,
					status: taskInput.status ?? 'todo',
					priority: taskInput.priority ?? 0,
					dueAt: taskInput.dueAt ?? null,
					plannedAt: taskInput.plannedAt ?? null,
					remindAt: taskInput.remindAt ?? null,
					canceledAt: null,
				}
				setResult(`已创建任务「${task.title}」 · ${space.name} / ${project?.name ?? '独立事项'}`)
				return task
			}
			setResult(`已创建项目「${String(input.name)}」 · ${space.name}`)
			return {
				...common,
				name: input.name,
				description: input.description,
				taskCount: 0,
				activeTaskCount: 0,
			}
		})
		const ownInternals = Reflect.get(window, '__TAURI_INTERNALS__')
		void preview.router.load()
		const dispose = () => {
			active = false
			for (const [timer, reject] of pending) {
				clearTimeout(timer)
				reject()
			}
			pending.clear()
			useDialogStore.setState(useDialogStore.getInitialState())
			preview.queryClient.clear()
			preview.router.history.destroy()
			if (Reflect.get(window, '__TAURI_INTERNALS__') === ownInternals) {
				clearMocks()
				Reflect.deleteProperty(window, '__TAURI_INTERNALS__')
				Reflect.deleteProperty(window, '__TAURI_EVENT_PLUGIN_INTERNALS__')
			}
		}
		setSession({ ...preview, dispose })
	}

	if (blocked)
		return (
			<p role='status'>
				此样例仅限普通浏览器；检测到已有 Tauri 环境，未安装 mock，也不会运行创建。
			</p>
		)
	if (!session) return <Button onPress={startPreview}>启动隔离创建样例</Button>
	return (
		<QueryClientProvider client={session.queryClient}>
			<RouterContextProvider router={session.router}>
				<ShortcutRegistryProvider registry={shortcuts}>
					<SubmitRegistryProvider>
						<div className='flex w-full max-w-3xl flex-col gap-4'>
							<p className='text-sm text-muted'>
								真实创建组合；只运行内存 IPC，不连接数据库。选择失败或延迟后再打开弹窗。
							</p>
							<div className='flex flex-wrap gap-2'>
								<Button
									onPress={() => setFailNext(!failNext)}
									variant='outline'
									aria-pressed={failNext}
								>
									下一次提交失败：{failNext ? '开' : '关'}
								</Button>
								<Button onPress={() => setSlow(!slow)} variant='outline' aria-pressed={slow}>
									模拟 1.2 秒写入：{slow ? '开' : '关'}
								</Button>
							</div>
							<CreateDialogFixture />
							<p aria-live='polite' className='text-sm'>
								{result}
							</p>
						</div>
					</SubmitRegistryProvider>
				</ShortcutRegistryProvider>
			</RouterContextProvider>
		</QueryClientProvider>
	)
}

function CreateDialogFixture() {
	const dialog = useShellCreateDialogState({
		currentScope: scope,
		spaces,
		projectOptions: projects,
		sidebarProjectsLoading: false,
	})
	const location = useLocation()
	return (
		<>
			<div className='flex flex-wrap gap-2'>
				<Button onPress={() => dialog.openTaskCreateDialog()}>新建任务</Button>
				<Button onPress={dialog.openProjectCreateDialog} variant='secondary'>
					新建项目
				</Button>
				<Button
					onPress={() => dialog.openTaskCreateDialog({ projectId: 'project-life' })}
					variant='outline'
				>
					从「周末旅行」创建任务
				</Button>
			</div>
			<p className='text-xs text-muted'>内存导航：{location.pathname}</p>
			<ShellCreationOverlays
				{...dialog}
				currentScope={scope}
				projectOptions={projects}
				projectsLoading={false}
				spaces={spaces}
			/>
		</>
	)
}

export const CREATE_DIALOG_SAMPLES: readonly UiLabReviewUnitInput[] = [
	{
		id: 'stoneflow-create-dialog-workspace',
		name: '创建弹窗 · 真实组合',
		view: 'stoneflow',
		category: 'Product Scenes',
		owner: 'Product',
		recommendedOwner: 'Product',
		disposition: 'keep',
		description:
			'Task / Project 创建真实组合：透明编辑区、Space 归属、日期渐进展示、一次性创建更多与失败恢复。',
		keywords: ['create', '创建弹窗', 'task', 'project', '日期', '更多', 'pending'],
		source: 'layout/ShellCreationOverlays + task/project public',
		states: 'Task / Project / 跨 Space / 日期菜单与 Calendar / 成功 / 下一次失败 / 延迟写入 / 放大',
		verification:
			'普通浏览器隔离 IPC；复用真实表单与菜单。原生 WebView、中文输入法及完整快捷键宿主仍需桌面验收。',
		inventoryRefs: ['stoneflow-scene-create-dialogs'],
		coverage: 'rendered',
		Preview: CreateDialogPreview,
	},
]
