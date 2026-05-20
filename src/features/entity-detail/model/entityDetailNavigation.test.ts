import { describe, expect, it } from 'vitest'

import {
	closeEntityDrawerTarget,
	openEntityDrawerTarget,
	openEntityPageTarget,
} from './entityDetailNavigation'

describe('entityDetailNavigation', () => {
	it('首次打开 Drawer 使用 push', () => {
		expect(openEntityDrawerTarget({ pathname: '/space/work/inbox', search: '' }, { kind: 'task', id: 'task-a' })).toEqual({
			pathname: '/space/work/inbox',
			search: '?task=task-a',
			replace: false,
		})
	})

	it('切换 task 使用 replace', () => {
		expect(
			openEntityDrawerTarget(
				{ pathname: '/space/work/inbox', search: '?task=task-a' },
				{ kind: 'task', id: 'task-b' },
			),
		).toEqual({
			pathname: '/space/work/inbox',
			search: '?task=task-b',
			replace: true,
		})
	})

	it('task 切 project 使用 replace 并删除 task query', () => {
		expect(
			openEntityDrawerTarget(
				{ pathname: '/spaces/projects', search: '?task=task-a&view=today' },
				{ kind: 'project', id: 'project-a' },
			),
		).toEqual({
			pathname: '/spaces/projects',
			search: '?view=today&project=project-a',
			replace: true,
		})
	})

	it('关闭 Drawer 使用 replace', () => {
		expect(closeEntityDrawerTarget({ pathname: '/spaces/views', search: '?view=today&task=task-a' })).toEqual({
			pathname: '/spaces/views',
			search: '?view=today',
			replace: true,
		})
	})

	it('独立详情页不带 drawer query', () => {
		expect(openEntityPageTarget({ kind: 'task', id: 'task/a' })).toEqual({
			pathname: '/tasks/task%2Fa',
			search: '',
			replace: false,
		})
		expect(openEntityPageTarget({ kind: 'project', id: 'project-a' })).toEqual({
			pathname: '/projects/project-a',
			search: '',
			replace: false,
		})
	})
})
