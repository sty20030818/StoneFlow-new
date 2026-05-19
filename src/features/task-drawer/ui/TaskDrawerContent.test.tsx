import { render, screen } from '@testing-library/react'

import type { TaskDetail } from '@/shared/types'

import { useProjectStore } from '@/features/project/model/useProjectStore'
import { useSpaceStore } from '@/features/space/model/useSpaceStore'
import { useTaskStore } from '@/features/task/model/useTaskStore'

import { TaskDrawerContent } from './TaskDrawerContent'

vi.mock('@/features/activity/api/getEntityActivities', () => ({
	getEntityActivities: vi.fn(async () => []),
}))

describe('TaskDrawerContent', () => {
	beforeEach(() => {
		const detailItem: TaskDetail = {
			id: 'task-1',
			spaceId: 'space-1',
			spaceName: '工作',
			spaceSlug: 'work',
			projectId: null,
			projectName: null,
			inboxAt: null,
			title: '任务 A',
			note: '',
			status: 'todo',
			statusChangedAt: '2026-05-19T00:00:00Z',
			priority: 2,
			dueAt: null,
			scheduledAt: null,
			reminderAt: null,
			completedAt: null,
			canceledAt: null,
			archivedAt: null,
			createdAt: '2026-05-19T00:00:00Z',
			updatedAt: '2026-05-19T00:00:00Z',
			sortOrder: 100,
			deletedAt: null,
		}

		useTaskStore.setState((state) => ({
			...state,
			detail: {
				item: detailItem,
				status: 'ready',
				error: null,
				taskId: 'task-1',
			},
			loadDetail: vi.fn(async () => undefined),
			clearDetail: vi.fn(),
			updateTask: vi.fn(async () => detailItem),
			archiveTask: vi.fn(async () => detailItem),
			restoreTask: vi.fn(async () => detailItem),
		}))
		useProjectStore.setState((state) => ({
			...state,
			sidebar: {
				...state.sidebar,
				options: [],
			},
		}))
		useSpaceStore.setState((state) => ({
			...state,
			spaces: [
				{
					id: 'space-1',
					name: '工作',
					iconKey: 'briefcase',
					colorKey: 'blue',
					isDefault: true,
					sortOrder: 100,
					archivedAt: null,
					deletedAt: null,
					createdAt: '2026-05-19T00:00:00Z',
					updatedAt: '2026-05-19T00:00:00Z',
				},
			],
		}))
	})

	it('详情态内容区使用统一滚动容器协议', () => {
		render(
			<TaskDrawerContent
				activeTab='details'
				currentSpaceLabel='工作'
				onClose={() => undefined}
				taskId='task-1'
			/>,
		)

		const viewport = screen.getByDisplayValue('任务 A').closest('[data-scroll-container="true"]')
		expect(viewport).toHaveAttribute('data-scroll-container', 'true')
	})
})
