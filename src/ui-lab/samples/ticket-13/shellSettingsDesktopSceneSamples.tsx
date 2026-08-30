import { useState } from 'react'

import { Alert, Button, ProgressBar } from '@heroui/react'

import { DangerConfirmProvider, useDangerConfirm } from '@/features/danger-confirm'
import { SyncConfigDialog } from '@/features/sync'

import type { UiLabReviewUnitInput } from '../../uiLabCatalog'
import {
	AlertToastPreview,
	EmptyErrorRecoveryPreview,
	LauncherLifecyclePreview,
} from '../ticket-06/feedbackLauncherSamples'
import { TaskDetailFocusPreview } from '../ticket-07/overlaySamples'
import {
	PageFrameFixture,
	SpaceEditorFixture,
	TaskDetailPublicFixture,
} from '../ticket-11/stoneFlowSharedComponentsSamples'
import { TaskMetadataReviewFixture } from '../ticket-12/taskCollectionCompositionSamples'

const PRODUCT_OWNERSHIP = {
	view: 'stoneflow',
	owner: 'Product',
	recommendedOwner: 'Product',
	disposition: 'keep',
} as const

function ShellSceneFixture() {
	return <PageFrameFixture />
}

function TaskDetailSceneFixture() {
	return (
		<div className='flex w-full max-w-5xl flex-col gap-8'>
			<TaskDetailPublicFixture />
			<TaskMetadataReviewFixture />
		</div>
	)
}

function SettingsSyncSceneFixture() {
	const [open, setOpen] = useState(false)
	const [databaseUrl, setDatabaseUrl] = useState('postgresql://stoneflow:demo@localhost/stoneflow')
	const [shouldFail, setShouldFail] = useState(true)
	const [status, setStatus] = useState('同步设置尚未保存')

	return (
		<div className='flex w-full max-w-5xl flex-col gap-6'>
			<section className='rounded-lg border border-surface p-4'>
				<h3 className='text-sm font-semibold'>真实 SyncConfigDialog</h3>
				<p className='mt-1 text-sm leading-6 text-muted'>
					第一次保存固定失败，重试成功；连接串和结果都只存在于当前 fixture。
				</p>
				<Button
					className='mt-4'
					onPress={() => {
						setShouldFail(true)
						setOpen(true)
					}}
					type='button'
				>
					打开同步配置
				</Button>
				<p aria-live='polite' className='mt-3 text-sm text-muted'>
					{status}
				</p>
			</section>
			<SyncConfigDialog
				configSource='system_keychain'
				databaseUrl={databaseUrl}
				onClose={() => setOpen(false)}
				onDatabaseUrlChange={setDatabaseUrl}
				onSave={async () => {
					if (shouldFail) {
						setShouldFail(false)
						throw new Error('Lab 模拟保存失败')
					}
					setStatus('已保存本地同步设置；未写入系统钥匙串')
				}}
				open={open}
			/>
		</div>
	)
}

function UpdateSceneFixture() {
	const [state, setState] = useState<'available' | 'downloading' | 'error' | 'ready'>('available')

	return (
		<div className='flex w-full max-w-2xl flex-col gap-4'>
			<div aria-label='更新状态' className='flex flex-wrap gap-2' role='group'>
				<Button onPress={() => setState('available')} size='sm' variant='outline'>
					发现更新
				</Button>
				<Button onPress={() => setState('downloading')} size='sm' variant='outline'>
					下载中
				</Button>
				<Button onPress={() => setState('error')} size='sm' variant='outline'>
					下载失败
				</Button>
				<Button onPress={() => setState('ready')} size='sm' variant='outline'>
					下载完成
				</Button>
			</div>

			{state === 'available' ? (
				<Alert status='accent'>
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>发现新版本 1.8.0</Alert.Title>
						<Alert.Description>下载前不会自动安装，也不会中断当前工作。</Alert.Description>
					</Alert.Content>
				</Alert>
			) : null}
			{state === 'downloading' ? (
				<div className='space-y-2 rounded-lg border border-surface p-4'>
					<p className='text-sm font-semibold'>正在下载更新</p>
					<ProgressBar aria-label='下载进度' value={48}>
						<ProgressBar.Track>
							<ProgressBar.Fill />
						</ProgressBar.Track>
					</ProgressBar>
					<p className='text-xs text-muted'>24 MB / 50 MB</p>
				</div>
			) : null}
			{state === 'error' ? (
				<Alert status='danger'>
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>更新下载失败</Alert.Title>
						<Alert.Description>安装包尚未就绪，可以直接重新下载。</Alert.Description>
					</Alert.Content>
					<Button onPress={() => setState('downloading')} size='sm' variant='danger'>
						重新下载
					</Button>
				</Alert>
			) : null}
			{state === 'ready' ? (
				<Alert status='success'>
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>安装包已就绪</Alert.Title>
						<Alert.Description>只有确认重启后才会安装。</Alert.Description>
					</Alert.Content>
				</Alert>
			) : null}
		</div>
	)
}

function DangerConfirmAction() {
	const { requestDangerConfirm } = useDangerConfirm()
	const [status, setStatus] = useState('尚未请求危险确认')

	return (
		<div className='flex w-full max-w-xl flex-col items-start gap-4'>
			<Button
				onPress={async () => {
					const confirmed = await requestDangerConfirm({
						intent: 'permanent-delete',
						entityType: 'task',
						count: 1,
						entityLabel: '本地演示任务',
					})
					setStatus(confirmed ? '已确认演示；没有删除数据' : '已取消演示；没有删除数据')
				}}
				type='button'
				variant='danger-soft'
			>
				模拟永久删除
			</Button>
			<p aria-live='polite' className='text-sm text-muted'>
				{status}
			</p>
		</div>
	)
}

function DangerConfirmSceneFixture() {
	return (
		<DangerConfirmProvider>
			<DangerConfirmAction />
		</DangerConfirmProvider>
	)
}

function ToastRecoverySceneFixture() {
	return (
		<div className='flex w-full max-w-5xl flex-col gap-8'>
			<AlertToastPreview />
			<EmptyErrorRecoveryPreview />
		</div>
	)
}

export const TICKET_13_SAMPLES = [
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-product-shell-scene-review',
		name: 'Shell · 可移植产品场景',
		category: 'Product Scenes',
		description:
			'复用真实 PageFrame 与 AppBreadcrumb；Sidebar 的既有 36px 证据和完整桌面壳边界通过总账链接。',
		keywords: ['shell', 'sidebar', 'breadcrumb', 'page frame', 'narrow', 'long text'],
		source:
			'src/layout/ShellChrome.tsx；src/shared/components/page-frame/PageFrame.tsx；src/shared/components/AppBreadcrumb.tsx',
		coverage: 'rendered',
		Preview: ShellSceneFixture,
		states: 'Header、Toolbar、Breadcrumb、Long Text、Narrow、Sidebar Current 由既有批次覆盖',
		verification: '浏览器验证可移植片段；完整 Router、窗口几何、Portal 与 WebView 仅真实应用',
		inventoryRefs: [
			'stoneflow-scene-shell',
			'stoneflow-shell-sidebar-scene',
			'stoneflow-breadcrumb',
			'page-frame-scene',
		],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-product-task-detail-scene-review',
		name: 'Task Detail · 可移植产品场景',
		category: 'Product Scenes',
		description:
			'组合公开 TaskPageState 与 Metadata；私有 Header、Autosave 和 Timeline 不复制，保存反馈链接既有证据。',
		keywords: ['task detail', 'metadata', 'autosave', 'timeline', 'save feedback'],
		source: 'src/features/task/detail/components/TaskDetailContent.tsx',
		coverage: 'rendered',
		Preview: TaskDetailSceneFixture,
		states: 'Page Empty、Recovery、Metadata；Save、Pending、Error、Retry 由第六批覆盖',
		verification:
			'浏览器只验证公开片段；ViewModel、Query、Autosave、Timeline 数据与持久化仅真实应用',
		inventoryRefs: [
			'stoneflow-scene-task-detail',
			'stoneflow-component-task-detail-content',
			'stoneflow-component-task-detail-header',
			'stoneflow-component-task-properties-section',
			'stoneflow-component-task-autosave-status',
			'stoneflow-component-task-page-state',
			'stoneflow-component-metadata-field-dropdown',
			'stoneflow-component-metadata-field-value',
			'stoneflow-component-task-activity-timeline',
		],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-product-settings-sync-scene-review',
		name: 'Settings / Sync · 可移植产品场景',
		category: 'Product Scenes',
		description: '复用保存反馈并直接渲染公开 SyncConfigDialog；首次失败、重试成功均为本地状态。',
		keywords: ['settings', 'sync', 'save', 'pending', 'error', 'retry'],
		source:
			'src/features/settings/components/SettingsPage.tsx；src/features/sync/components/SyncConfigDialog.tsx',
		coverage: 'rendered',
		Preview: SettingsSyncSceneFixture,
		states: 'Default、Saving、Saved、Failure、Retry、Dialog Close',
		verification: '本地受控状态；不调用同步、持久化、系统钥匙串或 Tauri Command',
		inventoryRefs: [
			'stoneflow-scene-settings-sync',
			'stoneflow-component-settings-page',
			'stoneflow-component-settings-sync-panel',
			'stoneflow-component-sync-config-dialog',
			'stoneflow-component-settings-toggle-row',
		],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-product-entity-detail-scene-review',
		name: 'Entity Detail · 可移植产品场景',
		category: 'Product Scenes',
		description:
			'复用第七批无副作用 Sheet 焦点场景；Resizable 原料已在第十批验证，真实 DrawerHost 不挂载。',
		keywords: ['entity detail', 'sheet', 'resizable', 'focus return', 'portal'],
		source: 'src/features/entity-detail/components/EntityDetailDrawerHost.tsx',
		coverage: 'rendered',
		Preview: TaskDetailFocusPreview,
		states: 'Closed、Sheet Open、Local Action、Escape、Sheet Focus Return、Long Text、Narrow',
		verification:
			'浏览器验证通用 Sheet；1024px 断点、Portal Owner、窗口几何、草稿和真实 DrawerHost 焦点恢复仅真实应用',
		inventoryRefs: [
			'stoneflow-scene-entity-detail',
			'stoneflow-component-entity-detail-drawer-host',
			'stoneflow-component-task-detail-content',
		],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-product-launcher-scene-review',
		name: 'Launcher · 可移植产品场景',
		category: 'Product Scenes',
		description: '复用第六批本地 Launcher 生命周期，覆盖输入、结果、空态、创建、错误和恢复。',
		keywords: ['launcher', 'search', 'results', 'empty', 'create', 'recovery'],
		source: 'src/features/launcher/LauncherPage.tsx',
		coverage: 'rendered',
		Preview: LauncherLifecyclePreview,
		states: 'Input、Results、Empty、Local Create、Error、Retry、Long Text、Narrow',
		verification: '浏览器本地状态；窗口激活、全局快捷键、原生关闭和真实提交仅 Launcher',
		inventoryRefs: [
			'stoneflow-scene-launcher',
			'stoneflow-component-launcher-page',
			'stoneflow-component-launcher-panel',
			'stoneflow-component-launcher-surface',
			'stoneflow-component-launcher-results',
			'stoneflow-component-empty-hint',
			'stoneflow-component-search-empty-hint',
			'stoneflow-component-create-row',
		],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-product-update-scene-review',
		name: 'Update · 可移植反馈场景',
		category: 'Product Scenes',
		description: '用本地可逆状态验证更新流程的可移植反馈，不挂载 Update Store 或执行更新操作。',
		keywords: ['update', 'loading', 'progress', 'error', 'retry', 'ready'],
		source: 'src/features/update/components/UpdateDialog.tsx',
		coverage: 'rendered',
		Preview: UpdateSceneFixture,
		states: 'Available、Downloading、Progress、Error、Retry、Ready',
		verification: '浏览器只验证反馈原料；检查、下载、安装、取消、重启与 Changelog Query 仅真实应用',
		inventoryRefs: [
			'stoneflow-scene-feedback-recovery',
			'stoneflow-component-update-dialog',
			'stoneflow-component-system-status-chip',
			'stoneflow-component-update-footer-chip',
			'stoneflow-component-update-status-footer-item',
		],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-product-danger-confirm-scene-review',
		name: 'Danger Confirm · 产品场景',
		category: 'Product Scenes',
		description:
			'通过公开 Provider 与 hook 渲染真实 DangerConfirmDialog；确认结果只更新 fixture 文本。',
		keywords: ['danger confirm', 'alert dialog', 'delete', 'cancel', 'focus return'],
		source: 'src/features/danger-confirm/index.ts',
		coverage: 'rendered',
		Preview: DangerConfirmSceneFixture,
		states: 'Closed、Open、Permanent Delete、Cancel、Confirm、Focus Return',
		verification: '本地 Promise 结果；不调用 archive、trash、delete 或任何业务命令',
		inventoryRefs: [
			'stoneflow-scene-feedback-recovery',
			'stoneflow-component-danger-confirm-dialog',
		],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-product-toast-recovery-scene-review',
		name: 'Toast / Recovery · 可移植产品场景',
		category: 'Product Scenes',
		description: '复用私有 ToastQueue 与空态/错误/恢复 fixture；卸载时清空队列。',
		keywords: ['toast', 'empty', 'error', 'recovery', 'queue cleanup'],
		source: 'src/routes/-router-feedback.tsx；src/features/launcher/results/ContinuousToast.tsx',
		coverage: 'rendered',
		Preview: ToastRecoverySceneFixture,
		states: 'Alert、Toast、Dismiss、Empty、Error、Retry、Recovered、Unmount Cleanup',
		verification: '本地 ToastQueue 与状态；Router reload、跨窗口队列及 Launcher Session 仅真实应用',
		inventoryRefs: [
			'stoneflow-scene-feedback-recovery',
			'stoneflow-component-router-feedback-page',
			'stoneflow-component-continuous-toast',
		],
	},
	{
		...PRODUCT_OWNERSHIP,
		id: 'stoneflow-product-space-editor-scene-review',
		name: 'Space Editor · 产品场景',
		category: 'Product Scenes',
		description:
			'复用真实公开 SpaceEditorDialog 与 ColorSwatchPicker；提交只写入当前 fixture 文本。',
		keywords: ['space editor', 'form', 'color swatch picker', 'validation', 'submit'],
		source: 'src/features/space/components/SpaceEditorDialog.tsx',
		coverage: 'rendered',
		Preview: SpaceEditorFixture,
		states: 'Closed、Open、Validation、Submit、Close、Focus Return',
		verification: '本地 onSubmit；不调用 Space mutation、数据库、Router 或 Tauri',
		inventoryRefs: ['stoneflow-scene-space-editor', 'stoneflow-component-space-editor-dialog'],
	},
] satisfies readonly UiLabReviewUnitInput[]
