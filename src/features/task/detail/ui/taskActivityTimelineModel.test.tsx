import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { ActivityTimelineEntry } from '@/features/activity/api/getEntityActivities'
import type { ProjectOption } from '@/features/project/model/types'
import type { Space } from '@/shared/types'

import { buildTaskActivityDisplayItems } from './taskActivityTimelineModel'

describe('buildTaskActivityDisplayItems', () => {
	it('优先级变化使用结果态 icon 和中文调整文案', () => {
		const [item] = buildTaskActivityDisplayItems({
			entries: [
				createEntry({
					action: 'task.priority.changed',
					changes: [
						createChange({
							field: 'priority',
							oldValue: 3,
							newValue: 1,
						}),
					],
				}),
			],
			projects: [],
			spaces: [],
		})

		expect(item.text).toContain('你 将优先级从 高 调整为 低')
		expect(renderToStaticMarkup(<>{item.icon}</>)).toContain('<svg')
	})

	it('新增时间使用 添加了 文案', () => {
		const [item] = buildTaskActivityDisplayItems({
			entries: [
				createEntry({
					action: 'task.due.updated',
					changes: [
						createChange({
							field: 'due_at',
							oldValue: null,
							newValue: '2026-05-30',
						}),
					],
				}),
			],
			projects: [],
			spaces: [],
		})

		expect(item.text).toBe('你 添加了截止时间 5 月 30 日')
	})

	it('移除时间使用 移除了 文案', () => {
		const [item] = buildTaskActivityDisplayItems({
			entries: [
				createEntry({
					action: 'task.reminder.updated',
					changes: [
						createChange({
							field: 'reminder_at',
							oldValue: '2026-05-28',
							newValue: null,
						}),
					],
				}),
			],
			projects: [],
			spaces: [],
		})

		expect(item.text).toBe('你 移除了提醒时间')
	})

	it('项目变化优先显示项目名', () => {
		const projects: ProjectOption[] = [{ id: 'project-1', name: '增长实验', spaceId: 'space-1' }]
		const [item] = buildTaskActivityDisplayItems({
			entries: [
				createEntry({
					action: 'task.moved.project',
					changes: [
						createChange({
							field: 'project_id',
							oldValue: null,
							newValue: 'project-1',
						}),
					],
				}),
			],
			projects,
			spaces: [],
		})

		expect(item.text).toBe('你 添加了项目 增长实验')
	})

	it('space 变化优先显示空间名', () => {
		const spaces: Space[] = [
			{
				id: 'space-1',
				name: '工作',
				iconKey: 'briefcase',
				colorKey: 'blue',
				sortOrder: 1,
				isDefault: true,
				archivedAt: null,
				deletedAt: null,
				createdAt: '2026-05-01T00:00:00Z',
				updatedAt: '2026-05-01T00:00:00Z',
			},
		]
		const [item] = buildTaskActivityDisplayItems({
			entries: [
				createEntry({
					action: 'task.moved.space',
					changes: [
						createChange({
							field: 'space_id',
							oldValue: null,
							newValue: 'space-1',
						}),
					],
				}),
			],
			projects: [],
			spaces,
		})

		expect(item.text).toBe('你 添加了空间 工作')
	})
})

function createEntry(overrides: Partial<ActivityTimelineEntry>): ActivityTimelineEntry {
	return {
		id: 'activity-1',
		entityType: 'task',
		entityId: 'task-1',
		action: 'task.priority.changed',
		actorType: 'user',
		source: 'app',
		summary: null,
		metadata: null,
		createdAt: '2026-05-25T00:00:00Z',
		changes: [],
		...overrides,
	}
}

function createChange({
	field,
	oldValue,
	newValue,
}: {
	field: string
	oldValue: unknown | null
	newValue: unknown | null
}) {
	return {
		id: `${field}-1`,
		field,
		oldValue,
		newValue,
		createdAt: '2026-05-25T00:00:00Z',
	}
}
