import type { LifecycleEntry } from '@/shared/types'

import { buildLifecycleCommandSelection } from './buildLifecycleCommandSelection'

describe('buildLifecycleCommandSelection', () => {
	it('按显式顺序投影有效条目，并保留独立焦点', () => {
		const entries = [
			createEntry({ id: 'task-a', entityType: 'task', title: '任务 A' }),
			createEntry({ id: 'project-a', entityType: 'project', title: '项目 A' }),
		]

		const selection = buildLifecycleCommandSelection({
			selectedIds: ['project-a', 'missing'],
			entries,
			mode: 'trash',
			focusedEntryId: 'task-a',
		})

		expect(selection).toMatchObject({
			type: 'lifecycle',
			ids: ['project-a'],
			focusedId: 'task-a',
			focusedType: 'lifecycle',
			source: 'lifecycle-list',
			isSingleSelection: true,
		})
		expect(selection.entities).toEqual([
			{
				id: 'project-a',
				type: 'lifecycle',
				title: '项目 A',
				subtitle: '项目 · 工作',
				lifecycleMode: 'trash',
				lifecycleEntityType: 'project',
			},
		])
	})
})

function createEntry(
	overrides: Partial<LifecycleEntry> & Pick<LifecycleEntry, 'id' | 'entityType' | 'title'>,
): LifecycleEntry {
	return {
		id: overrides.id,
		entityType: overrides.entityType,
		title: overrides.title,
		spaceId: overrides.spaceId ?? 'space-a',
		spaceName: overrides.spaceName ?? '工作',
		projectId: overrides.projectId ?? null,
		projectName: overrides.projectName ?? null,
		archivedAt: overrides.archivedAt ?? '2026-08-19T00:00:00Z',
		deletedAt: overrides.deletedAt ?? '2026-08-19T00:00:00Z',
		sourceType: overrides.sourceType ?? 'self',
		sourceId: overrides.sourceId ?? overrides.id,
		restoreHint: overrides.restoreHint ?? '恢复提示',
	}
}
