import { Button } from '@heroui/react'
import { useRef, useState } from 'react'

import { SubmitRegistryProvider } from '@/features/submit'
import {
	ViewActionsMenu,
	ViewEditorDialog,
	ViewSaveDialog,
	SavedViewLibraryContent,
	SavedViewPageState,
	type ViewSaveFlow,
} from '@/features/view'
import type { UnavailableView, View } from '@/shared/types'

import type { UiLabReviewUnitInput } from '../uiLabCatalog'

const INITIAL_VIEW: View = {
	id: 'lab-view-management',
	name: '需要在窄窗口中完整编辑的长期项目视图——跨空间任务同步、重命名失败后的输入保留与再次保存',
	scope: { type: 'all' },
	context: { kind: 'all' },
	baseViewKey: 'active',
	filters: { clauses: [{ id: 'status', field: 'status', op: 'is', values: ['todo'] }] },
	position: 0,
	createdAt: '2026-09-13T00:00:00Z',
	updatedAt: '2026-09-13T00:00:00Z',
}

const LONG_ERROR =
	'这是样例模拟的写入失败，记录和输入均未丢失。请检查窄窗口中错误是否完整换行、底部取消与重试按钮是否仍可到达，然后直接重试。' +
	'LongUnbrokenDiagnosticTextForWrapping'.repeat(5)

function ViewManagementPreview() {
	const [session, setSession] = useState(0)
	return (
		<div className='flex w-full min-w-0 max-w-3xl flex-col gap-3'>
			<p className='text-sm text-muted'>
				保存和编辑使用受控状态展示，提交回调只展示长错误；删除首次失败后可重试。仅使用样例内存，无
				IPC 或数据库连接。
			</p>
			<Button
				className='self-start'
				onPress={() => setSession((value) => value + 1)}
				variant='outline'
			>
				重置样例
			</Button>
			<SubmitRegistryProvider key={session}>
				<ViewManagementFixture />
				<ViewRecoveryFixture />
			</SubmitRegistryProvider>
		</div>
	)
}

function ViewRecoveryFixture() {
	const [page, setPage] = useState<'library' | 'detail' | 'read-error'>('library')
	const [pending, setPending] = useState(false)
	const [view, setView] = useState<UnavailableView | null>({
		id: 'unavailable-view',
		name: INITIAL_VIEW.name,
		position: 1,
		createdAt: INITIAL_VIEW.createdAt,
		updatedAt: INITIAL_VIEW.updatedAt,
		scope: null,
		definitionError: '原范围无法识别，保留记录供检查或删除。' + LONG_ERROR,
	})
	const attempts = useRef(0)
	const reloadViews = () => setPending(true)
	async function remove() {
		if (++attempts.current === 1) throw new Error(LONG_ERROR)
		setView(null)
		setPage('library')
	}
	return (
		<section aria-label='不可用视图恢复样例' className='grid min-w-0 gap-3'>
			<div className='flex flex-wrap gap-2'>
				<Button
					onPress={() => {
						setPage('read-error')
						setPending(false)
					}}
					variant='outline'
				>
					读取失败示例
				</Button>
				<Button
					onPress={() => {
						setPage('library')
						setPending(false)
					}}
					variant='outline'
				>
					完成读取示例
				</Button>
			</div>
			{page === 'detail' ? (
				<SavedViewPageState
					scene={{
						viewStatus: 'invalid-definition',
						activeView: view,
						breadcrumbItems: [
							{ key: 'recovery', label: view?.name ?? '已删除视图', current: true },
						],
						deleteActiveView: remove,
						openLibrary: () => setPage('library'),
						reloadViews,
						isReloading: pending,
					}}
				/>
			) : (
				<SavedViewLibraryContent
					scene={{
						status: page === 'read-error' ? 'error' : 'ready',
						views: view ? [view] : [],
						search: '',
						reloadViews,
						isReloading: pending,
						openView: () => setPage('detail'),
						deleteView: remove,
						editor: { openCreate: () => undefined, openEdit: () => undefined },
					}}
				/>
			)}
		</section>
	)
}

type PreviewState = 'idle' | 'pending' | 'write-error' | 'open-error'
type PreviewDialog = 'rename' | 'create' | 'save' | null

function ViewManagementFixture() {
	const [view, setView] = useState<View | null>(INITIAL_VIEW)
	const [dialog, setDialog] = useState<PreviewDialog>(null)
	const [sessionKey, setSessionKey] = useState(0)
	const [preview, setPreview] = useState<PreviewState>('idle')
	const [result, setResult] = useState(
		'先选择预设状态，再打开真实组件。共享 flow 的异步时序由页面测试验证。',
	)
	const deleteAttempts = useRef(0)
	const canOpenResult = dialog !== 'rename' && preview === 'open-error'

	function showDialog(next: PreviewDialog) {
		setSessionKey((value) => value + 1)
		setDialog(next)
	}
	async function showWriteError() {
		setPreview('write-error')
		setResult('提交回调已触发。此受控展示固定返回长错误，不执行持久化或导航。')
	}
	const flow: ViewSaveFlow = {
		open: dialog !== null,
		sessionKey,
		pending: preview === 'pending' ? (dialog === 'rename' ? 'rename' : 'create') : null,
		error: canOpenResult
			? { kind: 'open', message: LONG_ERROR }
			: preview === 'write-error'
				? { kind: 'write', message: LONG_ERROR }
				: null,
		savedView: canOpenResult ? INITIAL_VIEW : null,
		begin: () => showDialog('save'),
		close: () => setDialog(null),
		submit: showWriteError,
		retryOpen: async () => {
			setResult('打开恢复回调已触发；此受控样例不进行导航或再次写入。')
			setDialog(null)
		},
	}

	return (
		<>
			<div className='flex flex-wrap gap-2' role='group' aria-label='预设状态'>
				{(
					[
						['idle', '可提交'],
						['pending', '等待中'],
						['write-error', '写入失败'],
						['open-error', '已保存但未打开'],
					] as const
				).map(([state, label]) => (
					<Button
						key={state}
						aria-pressed={preview === state}
						onPress={() => setPreview(state)}
						variant='outline'
					>
						{label}
					</Button>
				))}
			</div>
			<div className='flex flex-wrap gap-2'>
				<Button onPress={() => showDialog('save')} variant='secondary'>
					保存 / 覆盖示例
				</Button>
				<Button onPress={() => showDialog('create')} variant='outline'>
					从视图库创建示例
				</Button>
			</div>
			{view ? (
				<div className='flex min-w-0 items-center gap-3 rounded-lg border border-separator bg-surface p-3'>
					<p className='min-w-0 flex-1 truncate text-sm' title={view.name}>
						{view.name}
					</p>
					<ViewActionsMenu
						activeView={view}
						onEdit={() => showDialog('rename')}
						onDelete={async () => {
							if (++deleteAttempts.current === 1) throw new Error(LONG_ERROR)
							setView(null)
						}}
					/>
				</div>
			) : (
				<p className='text-sm'>样例 View 已删除，点击「重置样例」重新开始。</p>
			)}
			<p className='wrap-anywhere text-sm text-muted' role='status'>
				{result}
			</p>
			{dialog === 'save' ? (
				<ViewSaveDialog flow={flow} canOverwrite onSave={showWriteError} />
			) : null}
			{dialog === 'rename' || dialog === 'create' ? (
				<ViewEditorDialog
					flow={flow}
					onCreate={showWriteError}
					onUpdate={showWriteError}
					projects={[]}
					view={dialog === 'rename' ? view : null}
				/>
			) : null}
		</>
	)
}

export const VIEW_MANAGEMENT_SAMPLES: readonly UiLabReviewUnitInput[] = [
	{
		id: 'stoneflow-view-management-recovery',
		name: '保存视图 · 保存与管理恢复',
		view: 'stoneflow',
		category: 'Product Scenes',
		owner: 'Product',
		recommendedOwner: 'Product',
		disposition: 'keep',
		description:
			'受控展示生产保存/编辑弹窗与删除菜单，检查等待、错误恢复、长文本和键盘入口；不复制共享 flow。',
		keywords: ['view', '保存视图', '重命名', '删除', '失败', '重试', 'pending', '窄窗口'],
		source:
			'src/features/view/components/ViewSaveDialog.tsx；src/features/view/components/ViewEditorDialog.tsx；src/features/view/components/ViewActionsMenu.tsx',
		states:
			'长名称 / 长错误 / 受控等待 / 写入失败 / 打开恢复 / 创建 / 另存 / 覆盖 / 删除重试 / 范围未知 / 不可用详情 / 读取重试',
		verification:
			'受控 UI 状态，无 IPC 或正式数据访问；共享 flow 与真实页面测试负责写入、导航和迟到结果，原生和视觉验收另记。',
		inventoryRefs: [
			'stoneflow-component-view-editor-dialog',
			'stoneflow-component-view-save-dialog',
			'stoneflow-component-view-actions-menu',
		],
		coverage: 'rendered',
		Preview: ViewManagementPreview,
	},
]
