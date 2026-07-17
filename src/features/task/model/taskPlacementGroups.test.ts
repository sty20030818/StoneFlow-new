import { describe, expect, it } from 'vitest'

import {
	buildTaskPlacementGroups,
	findTaskPlacementGroupItem,
	getTaskPlacementGroupSearchText,
} from './taskPlacementGroups'
import { getTaskPlacementTargetValue, isTaskPlacementTargetEqual } from './taskPlacementTarget'

describe('task-placement-groups', () => {
	it('无 currentSpaceId 时返回空数组', () => {
		expect(
			buildTaskPlacementGroups({
				mode: 'global',
				currentSpaceId: null,
				spaces: [{ id: 'space-a', name: '工作' }],
				projects: [],
			}),
		).toEqual([])
	})

	it('global 模式当前 space 第一组，且每组都有收件箱和独立事项', () => {
		const groups = buildTaskPlacementGroups({
			mode: 'global',
			currentSpaceId: 'space-b',
			spaces: [
				{ id: 'space-a', name: '工作' },
				{ id: 'space-b', name: '生活' },
			],
			projects: [
				{
					id: 'project-a',
					name: '项目 A',
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

		expect(groups.map((group) => group.heading)).toEqual(['生活', '工作'])
		expect(groups[0]?.items.map((item) => item.title)).toEqual(['收件箱', '独立事项', '项目 B'])
		expect(groups[1]?.items.map((item) => item.title)).toEqual(['收件箱', '独立事项', '项目 A'])
		expect(groups[0]?.items.map((item) => item.digit)).toEqual(['0', '1', undefined])
	})

	it('local 模式只显示当前 space，顺序固定为 inbox -> no_project -> projects', () => {
		const groups = buildTaskPlacementGroups({
			mode: 'local',
			currentSpaceId: 'space-a',
			spaces: [
				{ id: 'space-a', name: '工作' },
				{ id: 'space-b', name: '生活' },
			],
			projects: [
				{
					id: 'project-a',
					name: '项目 A',
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

		expect(groups).toHaveLength(1)
		expect(groups[0]?.heading).toBe('工作')
		expect(groups[0]?.items.map((item) => item.title)).toEqual(['收件箱', '独立事项', '项目 A'])
	})

	it('已完成项目不会出现在分组中', () => {
		const groups = buildTaskPlacementGroups({
			mode: 'global',
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

		expect(groups[0]?.items.map((item) => item.title)).toEqual(['收件箱', '独立事项'])
	})

	it('target helper 和 group item 查找覆盖三态', () => {
		const groups = buildTaskPlacementGroups({
			mode: 'global',
			currentSpaceId: 'space-a',
			spaces: [{ id: 'space-a', name: '工作' }],
			projects: [
				{
					id: 'project-a',
					name: '项目 A',
					spaceId: 'space-a',
					spaceName: '工作',
					completedAt: null,
				},
			],
		})

		expect(getTaskPlacementTargetValue({ kind: 'inbox', spaceId: 'space-a' })).toBe('inbox:space-a')
		expect(getTaskPlacementTargetValue({ kind: 'no_project', spaceId: 'space-a' })).toBe(
			'no_project:space-a',
		)
		expect(
			getTaskPlacementTargetValue({
				kind: 'project',
				spaceId: 'space-a',
				projectId: 'project-a',
			}),
		).toBe('project:project-a')

		expect(
			isTaskPlacementTargetEqual(
				{ kind: 'inbox', spaceId: 'space-a' },
				{ kind: 'inbox', spaceId: 'space-a' },
			),
		).toBe(true)
		expect(
			isTaskPlacementTargetEqual(
				{ kind: 'no_project', spaceId: 'space-a' },
				{ kind: 'project', spaceId: 'space-a', projectId: 'project-a' },
			),
		).toBe(false)

		expect(findTaskPlacementGroupItem(groups, { kind: 'inbox', spaceId: 'space-a' })?.title).toBe(
			'收件箱',
		)
		expect(
			findTaskPlacementGroupItem(groups, {
				kind: 'project',
				spaceId: 'space-a',
				projectId: 'project-a',
			})?.title,
		).toBe('项目 A')
	})

	it('搜索文本拼接稳定', () => {
		expect(
			getTaskPlacementGroupSearchText({
				title: '项目 A',
				note: '备注',
				spaceName: '工作',
				meta: 'Project',
			}),
		).toBe('项目 A 备注 工作 Project')
	})
})
