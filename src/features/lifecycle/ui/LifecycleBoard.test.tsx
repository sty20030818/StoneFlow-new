import { render, screen } from '@testing-library/react'

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
})

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
