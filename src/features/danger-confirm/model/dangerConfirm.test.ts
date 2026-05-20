import { buildDangerConfirmCopy } from './dangerConfirm'

describe('buildDangerConfirmCopy', () => {
	it('单条归档使用实体名文案', () => {
		expect(
			buildDangerConfirmCopy({
				intent: 'archive',
				entityType: 'task',
				count: 1,
				entityLabel: '任务 A',
			}),
		).toEqual({
			title: '确认归档「任务 A」吗？',
			description: '归档后可在归档页恢复。',
			confirmLabel: '归档',
			cancelLabel: '取消',
			destructive: false,
		})
	})

	it('单条移入回收站使用 destructive 文案', () => {
		expect(
			buildDangerConfirmCopy({
				intent: 'trash',
				entityType: 'project',
				count: 1,
				entityLabel: '项目 A',
			}),
		).toEqual({
			title: '确认移入回收站「项目 A」吗？',
			description: '移入回收站后可恢复。',
			confirmLabel: '移入回收站',
			cancelLabel: '取消',
			destructive: true,
		})
	})

	it('多条永久删除使用批量文案', () => {
		expect(
			buildDangerConfirmCopy({
				intent: 'permanent-delete',
				entityType: 'lifecycle-entry',
				count: 2,
			}),
		).toEqual({
			title: '永久删除选中条目？',
			description: '将永久删除 2 个条目。此操作不可撤销。',
			confirmLabel: '永久删除',
			cancelLabel: '取消',
			destructive: true,
		})
	})
})
