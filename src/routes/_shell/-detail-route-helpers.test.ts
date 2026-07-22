import { describe, expect, it } from 'vitest'
import type { Space } from '@/shared/types'

import {
	createProjectLoaderError,
	createProjectUnavailableError,
	createTaskLoaderError,
	createTaskUnavailableError,
	resolveVisibleSpaceScope,
} from './-detail-route-helpers'

function createSpace(input: Pick<Space, 'id' | 'name'>): Space {
	return {
		id: input.id,
		name: input.name,
		colorKey: 'blue',
		iconKey: 'inbox',
		isDefault: true,
		position: 0,
		archivedAt: null,
		deletedAt: null,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
	}
}

describe('detail route helpers', () => {
	it('可见 space 返回 space scope', () => {
		expect(
			resolveVisibleSpaceScope('space-1', [createSpace({ id: 'space-1', name: '工作' })]),
		).toEqual({
			type: 'space',
			spaceId: 'space-1',
		})
	})

	it('不可见 space 返回 null', () => {
		expect(
			resolveVisibleSpaceScope('space-1', [createSpace({ id: 'space-2', name: '生活' })]),
		).toBeNull()
	})

	it('任务不可见错误文案稳定', () => {
		expect(createTaskUnavailableError()).toEqual({
			title: '任务不可用',
			description: '当前任务所属 Space 不可见，可能已被归档、删除，或当前账号无权访问。',
			pageTitle: '任务详情',
		})
	})

	it('项目不可见错误文案稳定', () => {
		expect(createProjectUnavailableError()).toEqual({
			title: '项目不可用',
			description: '当前项目不可见，可能已被归档、删除，或当前账号无权访问。',
			pageTitle: '项目详情',
			actionLabel: '返回工作区',
			actionTo: '/all/tasks',
		})
	})

	it('任务加载错误透传 message', () => {
		expect(createTaskLoaderError(new Error('not found'))).toEqual({
			title: '任务不可用',
			description: 'not found',
			pageTitle: '任务详情',
		})
	})

	it('项目加载错误透传 message', () => {
		expect(createProjectLoaderError(new Error('not found'))).toEqual({
			title: '项目不可用',
			description: 'not found',
			pageTitle: '项目详情',
			actionLabel: '返回工作区',
			actionTo: '/all/tasks',
		})
	})
})
