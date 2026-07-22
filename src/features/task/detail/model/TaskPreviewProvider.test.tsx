import { act, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { TaskListItem } from '@/shared/types'

import { TaskPreviewProvider, useRegisterTaskPreviewSource } from './TaskPreviewProvider'
import { useTaskPreviewController as useTaskPreviewControllerModel } from './useTaskPreviewController'

vi.mock('@/features/task/api/taskLinks', () => ({
	listTaskLinks: vi.fn(() => Promise.resolve([])),
}))

describe('TaskPreviewProvider', () => {
	it('重复打开同一个任务时关闭预览', () => {
		function Harness() {
			const controller = useTaskPreviewControllerModel()
			const task = createTask({ id: 'task-a', title: '任务 A' })
			useRegisterTaskPreviewSource({
				tasks: [task],
				focusedTaskId: task.id,
				activeTaskId: null,
			})

			return (
				<div>
					<button onClick={() => controller.openPreview(task.id, 'pointer')} type='button'>
						打开预览
					</button>
					<div data-testid='preview-open'>{controller.previewState.open ? 'open' : 'closed'}</div>
					<div data-testid='preview-title'>{controller.targetTask?.title ?? 'none'}</div>
				</div>
			)
		}

		render(
			<TaskPreviewProvider>
				<Harness />
			</TaskPreviewProvider>,
		)

		act(() => {
			screen.getByRole('button', { name: '打开预览' }).click()
		})
		expect(screen.getByTestId('preview-open')).toHaveTextContent('open')
		expect(screen.getByTestId('preview-title')).toHaveTextContent('任务 A')

		act(() => {
			screen.getByRole('button', { name: '打开预览' }).click()
		})
		expect(screen.getByTestId('preview-open')).toHaveTextContent('closed')
		expect(screen.getByTestId('preview-title')).toHaveTextContent('none')
	})

	it('预览打开后 source 暂时为空时保留最近一次可渲染任务', () => {
		function Harness({ tasks }: { tasks: TaskListItem[] }) {
			const controller = useTaskPreviewControllerModel()
			useRegisterTaskPreviewSource({
				tasks,
				focusedTaskId: tasks[0]?.id ?? null,
				activeTaskId: null,
			})

			useEffect(() => {
				if (tasks.length > 0 && !controller.previewState.open) {
					controller.openPreview(tasks[0].id, 'keyboard')
				}
			}, [controller, tasks])

			return (
				<div>
					<div data-testid='preview-open'>{controller.previewState.open ? 'open' : 'closed'}</div>
					<div data-testid='preview-title'>{controller.targetTask?.title ?? 'none'}</div>
				</div>
			)
		}

		const { rerender } = render(
			<TaskPreviewProvider>
				<Harness tasks={[createTask({ id: 'task-a', title: '任务 A' })]} />
			</TaskPreviewProvider>,
		)

		expect(screen.getByTestId('preview-open')).toHaveTextContent('open')
		expect(screen.getByTestId('preview-title')).toHaveTextContent('任务 A')

		act(() => {
			rerender(
				<TaskPreviewProvider>
					<Harness tasks={[]} />
				</TaskPreviewProvider>,
			)
		})

		expect(screen.getByTestId('preview-open')).toHaveTextContent('open')
		expect(screen.getByTestId('preview-title')).toHaveTextContent('任务 A')
	})
})

function createTask(
	overrides: Partial<TaskListItem> & Pick<TaskListItem, 'id' | 'title'>,
): TaskListItem {
	const { id, title, ...rest } = overrides

	return {
		spaceId: 'space-a',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: null,
		projectName: null,
		inboxAt: '2026-05-15T00:00:00Z',
		note: null,
		status: 'todo',
		statusChangedAt: '2026-05-15T00:00:00Z',
		priority: 2,
		dueAt: null,
		plannedAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-15T00:00:00Z',
		updatedAt: '2026-05-15T00:00:00Z',
		...rest,
		id,
		title,
	}
}
