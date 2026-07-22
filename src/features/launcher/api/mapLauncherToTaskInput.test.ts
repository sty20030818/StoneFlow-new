import { mapLauncherToTaskInput } from './mapLauncherToTaskInput'

describe('mapLauncherToTaskInput', () => {
	it('inbox placement 保留 spaceId', () => {
		expect(
			mapLauncherToTaskInput({
				spaceId: 'space-1',
				placement: { kind: 'inbox', projectId: null },
				title: '  标题  ',
				note: null,
				status: 'todo',
				priority: 2,
				dueAt: null,
				plannedAt: null,
				remindAt: null,
			}),
		).toEqual({
			spaceId: 'space-1',
			placement: { kind: 'inbox' },
			title: '标题',
			note: null,
			status: 'todo',
			priority: 2,
			dueAt: null,
			plannedAt: null,
			remindAt: null,
		})
	})

	it('project placement 时 spaceId 置 null，并带上 projectId', () => {
		expect(
			mapLauncherToTaskInput({
				spaceId: 'space-1',
				placement: { kind: 'project', projectId: 'project-9' },
				title: '项目任务',
				note: '  备注  ',
				status: 'doing',
				priority: 1,
				dueAt: '2026-01-01',
				plannedAt: null,
				remindAt: null,
			}),
		).toMatchObject({
			spaceId: null,
			placement: { kind: 'project', projectId: 'project-9' },
			title: '项目任务',
			note: '备注',
			status: 'doing',
			priority: 1,
		})
	})
})
