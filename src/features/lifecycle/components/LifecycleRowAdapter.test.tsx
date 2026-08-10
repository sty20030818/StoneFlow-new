import { fireEvent, screen, waitFor } from '@testing-library/react'

import { DangerConfirmProvider } from '@/features/danger-confirm'
import type { LifecycleEntry } from '@/shared/types'
import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'
import { LifecycleRowAdapter, type LifecycleRowAdapterProps } from './LifecycleRowAdapter'

function createEntry(
	overrides: Partial<LifecycleEntry> & Pick<LifecycleEntry, 'id' | 'entityType' | 'title'>,
): LifecycleEntry {
	return {
		id: overrides.id,
		entityType: overrides.entityType,
		title: overrides.title,
		spaceId: overrides.spaceId ?? 'space-1',
		spaceName: overrides.spaceName ?? '工作',
		projectId: overrides.projectId ?? null,
		projectName: overrides.projectName ?? null,
		archivedAt: overrides.archivedAt ?? '2026-05-03T10:00:00Z',
		deletedAt: overrides.deletedAt ?? '2026-05-03T10:00:00Z',
		sourceType: overrides.sourceType ?? 'self',
		sourceId: overrides.sourceId ?? overrides.id,
		restoreHint: overrides.restoreHint ?? '恢复提示',
	}
}

function buildActions(): LifecycleRowAdapterProps['actions'] {
	return {
		onToggleSelected: vi.fn(),
		onRestore: vi.fn(),
		onRestoreEntries: vi.fn(),
		onOpenDetail: vi.fn(),
		onMoveToTrash: vi.fn(),
		onMoveToTrashEntries: vi.fn(),
		onPermanentlyDelete: vi.fn(),
		onPermanentlyDeleteEntries: vi.fn(),
	}
}

describe('LifecycleRowAdapter', () => {
	it('常驻动作仅保留恢复按钮并触发回调', () => {
		const entry = createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' })
		const actions = buildActions()

		render(
			<DangerConfirmProvider>
				<LifecycleRowAdapter
					actions={actions}
					entry={entry}
					mode='archive'
					rowState={{ isPending: false, isSelected: false }}
				/>
			</DangerConfirmProvider>,
		)

		expect(screen.getByRole('button', { name: '恢复' })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '永久删除' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '恢复' }))
		expect(actions.onRestore).toHaveBeenCalledWith(entry)
	})

	it('archive 模式支持整行打开详情', () => {
		const entry = createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' })
		const actions = buildActions()

		render(
			<DangerConfirmProvider>
				<LifecycleRowAdapter
					actions={actions}
					entry={entry}
					mode='archive'
					rowState={{ isPending: false, isSelected: false }}
				/>
			</DangerConfirmProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: '打开 任务 A' }))
		expect(actions.onOpenDetail).toHaveBeenCalledWith(entry)
	})

	it('未接入项目详情抽屉前，归档项目不暴露假打开动作', () => {
		const entry = createEntry({ id: 'project-1', entityType: 'project', title: '项目 A' })
		const actions = buildActions()

		render(
			<DangerConfirmProvider>
				<LifecycleRowAdapter
					actions={actions}
					entry={entry}
					mode='archive'
					rowState={{ isPending: false, isSelected: false }}
				/>
			</DangerConfirmProvider>,
		)

		expect(screen.queryByRole('button', { name: '打开 项目 A' })).not.toBeInTheDocument()
	})

	it('trash 模式禁用整行打开详情', () => {
		const entry = createEntry({ id: 'space-1', entityType: 'space', title: '工作空间' })
		const actions = buildActions()

		render(
			<DangerConfirmProvider>
				<LifecycleRowAdapter
					actions={actions}
					entry={entry}
					mode='trash'
					rowState={{ isPending: true, isSelected: true }}
				/>
			</DangerConfirmProvider>,
		)

		expect(screen.queryByRole('button', { name: '打开 工作空间' })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '恢复' })).toBeDisabled()
		expect(screen.getByRole('checkbox', { name: '选择 工作空间' })).toBeDisabled()
	})

	it('archive 右键菜单显示单条处置动作，并在确认后移入回收站', async () => {
		const entry = createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' })
		const actions = buildActions()

		render(
			<DangerConfirmProvider>
				<LifecycleRowAdapter
					actions={actions}
					entry={entry}
					mode='archive'
					rowState={{ isPending: false, isSelected: false }}
				/>
			</DangerConfirmProvider>,
		)

		fireEvent.contextMenu(screen.getByRole('button', { name: '打开 任务 A' }))
		expect(await screen.findByRole('menuitem', { name: '打开详情' })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: '恢复' })).toBeInTheDocument()
		fireEvent.click(screen.getByRole('menuitem', { name: '移入回收站' }))
		expect(actions.onMoveToTrash).not.toHaveBeenCalled()

		fireEvent.click(await screen.findByRole('button', { name: '移入回收站' }))
		await waitFor(() => {
			expect(actions.onMoveToTrash).toHaveBeenCalledWith(entry)
		})
	})

	it('多选右键显示全部前缀，并走批量动作回调', async () => {
		const entry = createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' })
		const sibling = createEntry({ id: 'task-2', entityType: 'task', title: '任务 B' })
		const actions = buildActions()

		render(
			<DangerConfirmProvider>
				<LifecycleRowAdapter
					actions={actions}
					contextEntries={[entry, sibling]}
					entry={entry}
					mode='trash'
					rowState={{ isPending: false, isSelected: true }}
				/>
			</DangerConfirmProvider>,
		)

		fireEvent.contextMenu(screen.getByText('任务 A'))
		expect(await screen.findByRole('menuitem', { name: '全部恢复' })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: '全部永久删除' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('menuitem', { name: '全部恢复' }))
		expect(actions.onRestoreEntries).toHaveBeenCalledWith([entry, sibling])

		fireEvent.contextMenu(screen.getByText('任务 A'))
		fireEvent.click(await screen.findByRole('menuitem', { name: '全部永久删除' }))
		fireEvent.click(await screen.findByRole('button', { name: '永久删除' }))
		await waitFor(() => {
			expect(actions.onPermanentlyDeleteEntries).toHaveBeenCalledWith([entry, sibling])
		})
	})
})
