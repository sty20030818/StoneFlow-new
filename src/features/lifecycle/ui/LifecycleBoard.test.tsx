import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

import { DangerConfirmProvider } from '@/features/danger-confirm'
import { LifecycleBoard, type LifecycleBoardSection } from '@/features/lifecycle/ui/LifecycleBoard'
import type { LifecycleEntry } from '@/shared/types'

describe('LifecycleBoard', () => {
	it('加载中不显示空态文案', () => {
		render(
			<DangerConfirmProvider>
				<LifecycleBoard
					emptyDescription='empty'
					emptyTitle='归档为空'
					mode='archive'
					onRestore={() => undefined}
					pendingEntryId={null}
					sections={[]}
					status='loading'
				/>
			</DangerConfirmProvider>,
		)

		expect(screen.queryByText('归档为空')).not.toBeInTheDocument()
		expect(screen.queryByText('empty')).not.toBeInTheDocument()
	})

	it('连续选中的生命周期行透传显式 group position', () => {
		const sections: LifecycleBoardSection[] = [
			{
				key: 'task',
				label: '已归档的任务',
				items: [
					createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' }),
					createEntry({ id: 'task-2', entityType: 'task', title: '任务 B' }),
					createEntry({ id: 'task-3', entityType: 'task', title: '任务 C' }),
				],
			},
		]

		render(
			<DangerConfirmProvider>
				<LifecycleBoard
					emptyDescription='empty'
					emptyTitle='empty'
					mode='archive'
					onOpenDetail={() => undefined}
					onRestore={() => undefined}
					pendingEntryId={null}
					sections={sections}
					selectedEntryIdSet={new Set(['task-2', 'task-3'])}
				/>
			</DangerConfirmProvider>,
		)

		expect(
			screen.getByRole('checkbox', { name: '选择 任务 B' }).closest('[data-lifecycle-entity]'),
		).toHaveAttribute('data-selection-group-position', 'first')
		expect(
			screen.getByRole('checkbox', { name: '选择 任务 C' }).closest('[data-lifecycle-entity]'),
		).toHaveAttribute('data-selection-group-position', 'last')
	})

	it('异步加载到首批 section 后默认展开', async () => {
		render(
			<DangerConfirmProvider>
				<LifecycleBoardAsyncHarness />
			</DangerConfirmProvider>,
		)

		expect(screen.queryByRole('button', { name: '打开 任务 A' })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '加载数据' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '加载数据' }))

		await waitFor(() => {
			expect(screen.getByRole('button', { name: '打开 任务 A' })).toBeInTheDocument()
		})
	})

	it('鼠标 hover 生命周期行时不显示键盘边框，移开后清除 hover', () => {
		render(
			<DangerConfirmProvider>
				<LifecycleBoardHoverHarness />
			</DangerConfirmProvider>,
		)

		const row = screen.getByRole('button', { name: '打开 任务 A' })

		fireEvent.mouseEnter(row)
		expect(row.className).toContain('bg-sf-list-row-hover')
		expect(row.className).not.toContain('border-sf-border-subtle')

		fireEvent.mouseLeave(row)
		expect(row.className).not.toContain('bg-sf-list-row-hover')
		expect(row.className).not.toContain('border-sf-border-subtle')
	})

	it('右键已选中行时菜单动作使用全部前缀', async () => {
		const onRestoreEntries = vi.fn()
		const sections: LifecycleBoardSection[] = [
			{
				key: 'task',
				label: '已删除的任务',
				items: [
					createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' }),
					createEntry({ id: 'task-2', entityType: 'task', title: '任务 B' }),
				],
			},
		]

		render(
			<DangerConfirmProvider>
				<LifecycleBoard
					emptyDescription='empty'
					emptyTitle='empty'
					mode='trash'
					onRestore={() => undefined}
					onRestoreEntries={onRestoreEntries}
					pendingEntryId={null}
					sections={sections}
					selectedEntryIdSet={new Set(['task-1', 'task-2'])}
				/>
			</DangerConfirmProvider>,
		)

		fireEvent.contextMenu(screen.getByText('任务 A'))
		fireEvent.click(await screen.findByRole('menuitem', { name: '全部恢复' }))

		expect(onRestoreEntries).toHaveBeenCalledWith(sections[0].items)
	})
})

function LifecycleBoardAsyncHarness() {
	const [sections, setSections] = useState<LifecycleBoardSection[]>([])

	return (
		<div>
			<button
				onClick={() =>
					setSections([
						{
							key: 'task',
							label: '已归档的任务',
							items: [createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' })],
						},
					])
				}
				type='button'
			>
				加载数据
			</button>
			<LifecycleBoard
				emptyDescription='empty'
				emptyTitle='empty'
				mode='archive'
				onOpenDetail={() => undefined}
				onRestore={() => undefined}
				pendingEntryId={null}
				sections={sections}
			/>
		</div>
	)
}

function LifecycleBoardHoverHarness() {
	const [focusedEntryId, setFocusedEntryId] = useState<string | null>(null)

	return (
		<LifecycleBoard
			emptyDescription='empty'
			emptyTitle='empty'
			focusedEntryId={focusedEntryId}
			mode='archive'
			onOpenDetail={() => undefined}
			onRestore={() => undefined}
			onSetFocusedEntry={setFocusedEntryId}
			pendingEntryId={null}
			sections={[
				{
					key: 'task',
					label: '已归档的任务',
					items: [createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' })],
				},
			]}
		/>
	)
}

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
