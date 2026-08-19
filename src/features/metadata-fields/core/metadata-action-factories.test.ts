import {
	createDueDateActionSpec,
	createParentProjectActionSpec,
	createPriorityActionSpec,
	createStatusActionSpec,
} from './metadata-action-factories'

describe('metadata action factories', () => {
	it('为状态、优先级和日期生成稳定数字合同', () => {
		expect(createStatusActionSpec().options.map((option) => option.digit)).toEqual([
			'1',
			'2',
			'3',
			'4',
			'5',
		])
		expect(createPriorityActionSpec().options.map((option) => option.digit)).toEqual([
			'0',
			'1',
			'2',
			'3',
			'4',
		])
		expect(
			createDueDateActionSpec({ currentValue: '2026-05-08', showClearOption: true }).options[0],
		).toMatchObject({ label: '移除当前日期', digit: '0', isEmptyValue: true })
	})

	it('父项目 action spec 只表达 generic field 语义', () => {
		expect(
			createParentProjectActionSpec({ projects: [{ id: 'project-1', name: '项目 A' }] }),
		).toMatchObject({
			fieldKey: 'parentProject',
			headerLabel: '设置父项目为...',
			commandPlaceholder: '选择父项目…',
		})
	})
})
