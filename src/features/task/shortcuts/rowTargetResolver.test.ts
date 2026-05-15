import { resolveTaskRowTarget } from './rowTargetResolver'

describe('resolveTaskRowTarget', () => {
	it('hover 优先于 keyboard focus', () => {
		expect(resolveTaskRowTarget({
			hover: { targetId: 'hover-task' },
			keyboardFocus: { targetId: 'focus-task' },
			active: { targetId: 'active-task' },
			selection: {
				ids: ['selected-task'],
				isSingleSelection: true,
				isMultiSelection: false,
			},
		})).toMatchObject({
			targetId: 'hover-task',
			source: 'hover',
			hasTarget: true,
		})
	})

	it('keyboard focus 优先于 active', () => {
		expect(resolveTaskRowTarget({
			hover: null,
			keyboardFocus: { targetId: 'focus-task' },
			active: { targetId: 'active-task' },
			selection: {
				ids: ['selected-task'],
				isSingleSelection: true,
				isMultiSelection: false,
			},
		})).toMatchObject({
			targetId: 'focus-task',
			source: 'focus',
		})
	})

	it('active 优先于单选 selected', () => {
		expect(resolveTaskRowTarget({
			hover: null,
			keyboardFocus: null,
			active: { targetId: 'active-task' },
			selection: {
				ids: ['selected-task'],
				isSingleSelection: true,
				isMultiSelection: false,
			},
		})).toMatchObject({
			targetId: 'active-task',
			source: 'drawer',
		})
	})

	it('单选 selected 可作为目标，多选 selected 不产生单行目标', () => {
		expect(resolveTaskRowTarget({
			hover: null,
			keyboardFocus: null,
			active: null,
			selection: {
				ids: ['selected-task'],
				isSingleSelection: true,
				isMultiSelection: false,
			},
		})).toMatchObject({
			targetId: 'selected-task',
			source: 'selection',
		})

		expect(resolveTaskRowTarget({
			hover: null,
			keyboardFocus: null,
			active: null,
			selection: {
				ids: ['task-a', 'task-b'],
				isSingleSelection: false,
				isMultiSelection: true,
			},
		})).toMatchObject({
			hasTarget: false,
			source: 'none',
		})
	})
})
