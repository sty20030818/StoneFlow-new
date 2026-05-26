import { describe, expect, it } from 'vitest'

import {
	buildTaskPlacementGroups,
	getTaskPlacementGroupSearchText,
	getTaskPlacementTargetValue,
} from '@/features/metadata-fields/core'

describe('task-placement-groups', () => {
	it('无 currentSpaceId 时返回空数组', () => {
		expect(
			buildTaskPlacementGroups({
				currentSpaceId: null,
				spaces: [{ id: 'space-a', name: '工作' }],
				projects: [],
			}),
		).toEqual([])
	})

	it('当前 space 第一组，且只有当前 space 有独立事项', () => {
		const groups = buildTaskPlacementGroups({
			currentSpaceId: 'space-a',
			spaces: [
				{ id: 'space-a', name: '工作' },
				{ id: 'space-b', name: '生活' },
			],
			projects: [
				{
					id: 'project-a',
					name: '项目 A',
					note: '当前空间项目',
					spaceId: 'space-a',
					spaceName: '工作',
					completedAt: null,
				},
				{
					id: 'project-b',
					name: '项目 B',
					spaceId: 'space-b',
					spaceName: '生活',
					completedAt: null,
				},
			],
		})

		expect(groups).toHaveLength(2)
		expect(groups[0]).toMatchObject({
			spaceId: 'space-a',
			heading: '工作',
		})
		expect(groups[0]?.items[0]).toMatchObject({
			key: 'no-project:space-a',
			title: '独立事项',
			meta: 'No Project',
			digit: '0',
			target: { kind: 'no_project', spaceId: 'space-a' },
		})
		expect(groups[0]?.items[1]).toMatchObject({
			key: 'project:project-a',
			title: '项目 A',
			target: { kind: 'project', spaceId: 'space-a', projectId: 'project-a' },
		})
		expect(groups[1]).toMatchObject({
			spaceId: 'space-b',
			heading: '生活',
		})
		expect(groups[1]?.items).toHaveLength(1)
		expect(groups[1]?.items[0]?.title).toBe('项目 B')
	})

	it('已完成项目不会出现在分组中', () => {
		const groups = buildTaskPlacementGroups({
			currentSpaceId: 'space-a',
			spaces: [{ id: 'space-a', name: '工作' }],
			projects: [
				{
					id: 'project-a',
					name: '项目 A',
					spaceId: 'space-a',
					spaceName: '工作',
					completedAt: '2026-05-20T00:00:00Z',
				},
			],
		})

		expect(groups).toEqual([
			{
				spaceId: 'space-a',
				heading: '工作',
				items: [
					{
						key: 'no-project:space-a',
						title: '独立事项',
						meta: 'No Project',
						value: '独立事项 工作 no project',
						target: { kind: 'no_project', spaceId: 'space-a' },
						digit: '0',
					},
				],
			},
		])
	})

	it('暴露稳定的 target value 与搜索文案 helper', () => {
		expect(
			getTaskPlacementTargetValue({
				kind: 'project',
				projectId: 'project-a',
				spaceId: 'space-a',
			}),
		).toBe('project:project-a')
		expect(getTaskPlacementTargetValue({ kind: 'no_project', spaceId: 'space-a' })).toBe(
			'no_project:space-a',
		)
		expect(
			getTaskPlacementGroupSearchText({
				title: '项目 A',
				note: '备注',
				spaceName: '工作',
			}),
		).toBe('项目 A 备注 工作')
	})
})
