import { fireEvent, render, screen } from '@testing-library/react'

import type { LifecycleEntry } from '@/shared/types'
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
		onOpenDetail: vi.fn(),
	}
}

describe('LifecycleRowAdapter', () => {
	it('常驻动作仅保留恢复按钮并触发回调', () => {
		const entry = createEntry({ id: 'task-1', entityType: 'task', title: '任务 A' })
		const actions = buildActions()

		render(
			<LifecycleRowAdapter
				actions={actions}
				entry={entry}
				mode='archive'
				rowState={{ isPending: false, isSelected: false }}
			/>,
		)

		expect(screen.getByRole('button', { name: '恢复' })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '永久删除' })).not.toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '恢复' }))
		expect(actions.onRestore).toHaveBeenCalledWith(entry)
	})

	it('archive 模式支持整行打开详情', () => {
		const entry = createEntry({ id: 'project-1', entityType: 'project', title: '项目 A' })
		const actions = buildActions()

		render(
			<LifecycleRowAdapter
				actions={actions}
				entry={entry}
				mode='archive'
				rowState={{ isPending: false, isSelected: false }}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: '打开 项目 A' }))
		expect(actions.onOpenDetail).toHaveBeenCalledWith(entry)
	})

	it('trash 模式禁用整行打开详情', () => {
		const entry = createEntry({ id: 'space-1', entityType: 'space', title: '工作空间' })
		const actions = buildActions()

		render(
			<LifecycleRowAdapter
				actions={actions}
				entry={entry}
				mode='trash'
				rowState={{ isPending: true, isSelected: true }}
			/>,
		)

		expect(screen.queryByRole('button', { name: '打开 工作空间' })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '恢复' })).toBeDisabled()
		expect(screen.getByRole('checkbox', { name: '选择 工作空间' })).toBeDisabled()
	})
})
