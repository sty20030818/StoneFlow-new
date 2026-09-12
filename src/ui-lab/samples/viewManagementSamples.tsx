import { Button } from '@heroui/react'
import { useRef, useState } from 'react'

import { SubmitRegistryProvider } from '@/features/submit'
import { ViewActionsMenu, ViewEditorDialog } from '@/features/view'
import type { View } from '@/shared/types'

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
				重命名和删除各自首次失败，再次尝试成功；默认等待 3 秒。仅使用样例内存，无 IPC 或数据库连接。
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
			</SubmitRegistryProvider>
		</div>
	)
}

function ViewManagementFixture() {
	const [view, setView] = useState<View | null>(INITIAL_VIEW)
	const [editingView, setEditingView] = useState<View | null>(null)
	const [open, setOpen] = useState(false)
	const [slow, setSlow] = useState(true)
	const [result, setResult] = useState('尚未操作。可通过右侧菜单重命名或删除。')
	const attempts = useRef({ rename: 0, delete: 0 })

	async function simulateWrite(operation: 'rename' | 'delete') {
		const attempt = ++attempts.current[operation]
		const label = operation === 'rename' ? '重命名' : '删除'
		setResult(`${label}第 ${attempt} 次提交中；可在等待期间关闭并重新打开。`)
		await new Promise<void>((resolve) => setTimeout(resolve, slow ? 3000 : 0))
		if (attempt === 1) {
			setResult(`${label}失败；记录保持原样，可使用原输入重试。`)
			throw new Error(LONG_ERROR)
		}
		setResult(`${label}成功，内存记录已更新。`)
	}

	function openEditor(target: View) {
		setEditingView(target)
		setOpen(true)
	}

	return (
		<>
			<Button
				aria-pressed={slow}
				className='self-start'
				onPress={() => setSlow(!slow)}
				variant='outline'
			>
				模拟 3 秒等待：{slow ? '开' : '关'}
			</Button>
			{view ? (
				<div className='flex min-w-0 items-center gap-3 rounded-lg border border-separator bg-surface p-3'>
					<p className='min-w-0 flex-1 truncate text-sm' title={view.name}>
						{view.name}
					</p>
					<ViewActionsMenu
						activeView={view}
						onDelete={async () => {
							await simulateWrite('delete')
							setView(null)
						}}
						onEdit={openEditor}
					/>
				</div>
			) : (
				<p className='text-sm'>样例 View 已删除，点击「重置样例」重新开始。</p>
			)}
			<p className='wrap-anywhere text-sm text-muted' role='status'>
				{result}
			</p>
			<ViewEditorDialog
				isSubmitting={false}
				onClose={() => setOpen(false)}
				onCreate={async () => {
					throw new Error('此样例只开放重命名与删除')
				}}
				onUpdate={async ({ name }) => {
					await simulateWrite('rename')
					setView((current) => (current ? { ...current, name: name ?? current.name } : current))
				}}
				open={open}
				projects={[]}
				view={editingView}
			/>
		</>
	)
}

export const VIEW_MANAGEMENT_SAMPLES: readonly UiLabReviewUnitInput[] = [
	{
		id: 'stoneflow-view-management-recovery',
		name: '保存视图 · 重命名与删除恢复',
		view: 'stoneflow',
		category: 'Product Scenes',
		owner: 'Product',
		recommendedOwner: 'Product',
		disposition: 'keep',
		description:
			'复用生产 ViewEditorDialog 与 ViewActionsMenu，检查等待、首次失败重试、长文本和关闭后的会话隔离。',
		keywords: ['view', '保存视图', '重命名', '删除', '失败', '重试', 'pending', '窄窗口'],
		source:
			'src/features/view/components/ViewEditorDialog.tsx；src/features/view/components/ViewActionsMenu.tsx',
		states: '长名称 / 长错误 / 3 秒等待 / 首次失败 / 重试成功 / 关闭再打开 / 删除后重置',
		verification:
			'仅内存异步回调，无 IPC 或正式数据访问；真实页面数据链由 ViewManagement.test.tsx 覆盖，原生和视觉验收另记。',
		inventoryRefs: [
			'stoneflow-component-view-editor-dialog',
			'stoneflow-component-view-actions-menu',
		],
		coverage: 'rendered',
		Preview: ViewManagementPreview,
	},
]
