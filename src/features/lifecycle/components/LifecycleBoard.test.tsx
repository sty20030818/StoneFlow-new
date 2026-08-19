import { fireEvent, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

import { DangerConfirmProvider } from '@/features/danger-confirm'
import {
	LifecycleBoard,
	type LifecycleBoardSection,
} from '@/features/lifecycle/components/LifecycleBoard'
import type { LifecycleEntry } from '@/shared/types'
import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'

describe('LifecycleBoard', () => {
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
