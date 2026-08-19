import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ActivityTimelineEntry } from '@/features/activity'

import { TaskActivityTimeline } from './TaskActivityTimeline'

const activityQueryState = vi.hoisted(() => ({
	data: [] as ActivityTimelineEntry[],
	isError: false,
	isLoading: false,
	isPending: false,
	error: null as Error | null,
	refetch: vi.fn(),
}))

vi.mock('@/features/activity', () => ({
	useEntityActivitiesQuery: () => activityQueryState,
}))

vi.mock('@/features/project', () => ({
	useProjectOptions: () => [],
}))

vi.mock('@/features/space', () => ({
	useSpaces: () => ({ spaces: [] }),
}))

describe('TaskActivityTimeline', () => {
	beforeEach(() => {
		activityQueryState.data = []
		activityQueryState.isError = false
		activityQueryState.isLoading = false
		activityQueryState.isPending = false
		activityQueryState.error = null
		activityQueryState.refetch.mockReset()
	})

	it('将就绪记录呈现为可访问的有序活动时间线', () => {
		activityQueryState.data = [
			createEntry({ id: 'activity-1', action: 'task.created' }),
			createEntry({
				id: 'activity-2',
				action: 'task.link.added',
				metadata: { title: '设计稿' },
			}),
		]

		render(<TaskActivityTimeline spaceId='space-1' taskId='task-1' />)

		const timeline = screen.getByRole('list', { name: '任务活动记录' })
		const items = within(timeline).getAllByRole('listitem')

		expect(timeline.tagName).toBe('OL')
		expect(items).toHaveLength(2)
		expect(items[0]).toHaveTextContent('你 创建了任务')
		expect(items[1]).toHaveTextContent('你 添加了链接 「设计稿」')
	})

	it('继续通过查看更多和收起控制时间线的可见范围', () => {
		activityQueryState.data = Array.from({ length: 7 }, (_, index) =>
			createEntry({
				id: `activity-${index + 1}`,
				action: 'task.created',
			}),
		)

		render(<TaskActivityTimeline spaceId='space-1' taskId='task-1' />)

		const timeline = screen.getByRole('list', { name: '任务活动记录' })
		expect(within(timeline).getAllByRole('listitem')).toHaveLength(6)

		fireEvent.click(screen.getByRole('button', { name: '查看更多' }))

		expect(within(timeline).getAllByRole('listitem')).toHaveLength(7)
		fireEvent.click(screen.getByRole('button', { name: '收起' }))
		expect(within(timeline).getAllByRole('listitem')).toHaveLength(6)
	})
})

function createEntry(overrides: Partial<ActivityTimelineEntry>): ActivityTimelineEntry {
	return {
		id: 'activity-1',
		entityType: 'task',
		entityId: 'task-1',
		action: 'task.created',
		actorType: 'user',
		source: 'app',
		summary: null,
		metadata: null,
		createdAt: '2026-08-18T00:00:00Z',
		changes: [],
		...overrides,
	}
}
