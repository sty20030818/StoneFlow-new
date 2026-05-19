import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

import { LifecycleBoard, type LifecycleBoardSection } from '@/features/lifecycle/ui/LifecycleBoard'
import type { LifecycleEntry } from '@/shared/types'

describe('LifecycleBoard', () => {
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
			<LifecycleBoard
				emptyDescription='empty'
				emptyTitle='empty'
				mode='archive'
				onOpenDetail={() => undefined}
				onRestore={() => undefined}
				pendingEntryId={null}
				sections={sections}
				selectedEntryIdSet={new Set(['task-2', 'task-3'])}
			/>,
		)

		expect(screen.getByRole('button', { name: '打开 任务 B' })).toHaveAttribute(
			'data-selection-group-position',
			'first',
		)
		expect(screen.getByRole('button', { name: '打开 任务 C' })).toHaveAttribute(
			'data-selection-group-position',
			'last',
		)
	})

	it('异步加载到首批 section 后默认展开', async () => {
		render(<LifecycleBoardAsyncHarness />)

		expect(screen.queryByRole('button', { name: '打开 任务 A' })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '加载数据' })).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '加载数据' }))

		await waitFor(() => {
			expect(screen.getByRole('button', { name: '打开 任务 A' })).toBeInTheDocument()
		})
	})

	it('鼠标 hover 生命周期行时不显示键盘边框，移开后清除 hover', () => {
		render(<LifecycleBoardHoverHarness />)

		const row = screen.getByRole('button', { name: '打开 任务 A' })

		fireEvent.mouseEnter(row)
		expect(row.className).toContain('bg-sf-list-row-hover')
		expect(row.className).not.toContain('border-sf-border-subtle')

		fireEvent.mouseLeave(row)
		expect(row.className).not.toContain('bg-sf-list-row-hover')
		expect(row.className).not.toContain('border-sf-border-subtle')
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
