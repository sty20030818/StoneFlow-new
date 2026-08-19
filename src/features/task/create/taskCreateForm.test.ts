import { describe, expect, it } from 'vitest'

import type { Space } from '@/shared/types'

import { buildTaskCreateDefaultValues, taskCreateSchema, toTaskCreateInput } from './taskCreateForm'

const spaces: Space[] = [
	{
		id: 'space-default',
		name: '个人',
		iconKey: 'user',
		colorKey: 'blue',
		isDefault: true,
		position: 0,
		archivedAt: null,
		deletedAt: null,
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
	},
	{
		id: 'space-work',
		name: '工作',
		iconKey: 'briefcase',
		colorKey: 'green',
		isDefault: false,
		position: 1,
		archivedAt: null,
		deletedAt: null,
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
	},
]

describe('taskCreateForm', () => {
	it('All scope 无 selectedSpaceId 时预填默认 Space，仍是具体 spaceId', () => {
		const values = buildTaskCreateDefaultValues({
			currentScope: { type: 'all' },
			spaces,
			initialPlacement: 'standalone',
			initialProjectId: null,
			selectedSpaceId: null,
			initialStatus: 'todo',
			projects: [],
		})

		expect(values.spaceId).toBe('space-default')
		expect(values.spaceId).not.toBe('')
	})

	it('All scope 显式选中 Space 时使用该 spaceId', () => {
		const values = buildTaskCreateDefaultValues({
			currentScope: { type: 'all' },
			spaces,
			initialPlacement: 'standalone',
			initialProjectId: null,
			selectedSpaceId: 'space-work',
			initialStatus: 'todo',
			projects: [],
		})

		expect(values.spaceId).toBe('space-work')
	})

	it('standalone 且 spaceId 为空时 schema 拒绝', () => {
		const result = taskCreateSchema.safeParse({
			title: '任务',
			note: '',
			priority: 0,
			spaceId: '',
			placement: 'standalone',
			projectId: '',
			status: 'todo',
			dueAt: null,
			plannedAt: null,
			remindAt: null,
			createMore: false,
		})

		expect(result.success).toBe(false)
	})

	it('toTaskCreateInput 把 standalone 任务落到具体 spaceId', () => {
		const input = toTaskCreateInput({
			title: ' 记一件事 ',
			note: '',
			priority: 2,
			spaceId: 'space-work',
			placement: 'standalone',
			projectId: '',
			status: 'todo',
			dueAt: null,
			plannedAt: null,
			remindAt: null,
			createMore: false,
		})

		expect(input).toMatchObject({
			spaceId: 'space-work',
			title: '记一件事',
			placement: { kind: 'standalone' },
		})
	})

	it('toTaskCreateInput 一次保留归属、状态、优先级和日期合同', () => {
		const input = toTaskCreateInput({
			title: ' 项目任务 ',
			note: ' 说明 ',
			priority: 3,
			spaceId: 'space-work',
			placement: 'project',
			projectId: 'project-a',
			status: 'doing',
			dueAt: '2026-08-20',
			plannedAt: '2026-08-21',
			remindAt: '2026-08-19',
			createMore: false,
		})

		expect(input).toEqual({
			spaceId: null,
			placement: { kind: 'project', projectId: 'project-a' },
			title: '项目任务',
			note: '说明',
			status: 'doing',
			priority: 3,
			dueAt: '2026-08-20',
			plannedAt: '2026-08-21',
			remindAt: '2026-08-19',
		})
	})
})
