import { resolveTaskRowTarget } from './rowTargetResolver'

describe('resolveTaskRowTarget', () => {
	it('selection 优先于 hover / active', () => {
		expect(
			resolveTaskRowTarget({
				hover: { targetId: 'hover-task' },
				active: { targetId: 'active-task' },
				selection: {
					ids: ['selected-task'],
					isSingleSelection: true,
					isMultiSelection: false,
				},
			}),
		).toMatchObject({
			targetId: 'selected-task',
			source: 'selection',
			hasTarget: true,
		})
	})

	it('hover 优先于 active', () => {
		expect(
			resolveTaskRowTarget({
				hover: { targetId: 'hover-task' },
				active: { targetId: 'active-task' },
				selection: {
					ids: ['task-a', 'task-b'],
					isSingleSelection: false,
					isMultiSelection: true,
				},
			}),
		).toMatchObject({
			targetId: 'hover-task',
			source: 'hover',
		})
	})

	it('active 在没有 selection / hover 时兜底', () => {
		expect(
			resolveTaskRowTarget({
				hover: null,
				active: { targetId: 'active-task' },
				selection: {
					ids: ['task-a', 'task-b'],
					isSingleSelection: false,
					isMultiSelection: true,
				},
			}),
		).toMatchObject({
			targetId: 'active-task',
			source: 'drawer',
		})
	})

	it('多选 selection 不产生单行目标', () => {
		expect(
			resolveTaskRowTarget({
				hover: null,
				active: null,
				selection: {
					ids: ['task-a', 'task-b'],
					isSingleSelection: false,
					isMultiSelection: true,
				},
			}),
		).toMatchObject({
			hasTarget: false,
			source: 'none',
		})
	})
})
