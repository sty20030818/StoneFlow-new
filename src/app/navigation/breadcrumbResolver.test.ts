import { describe, expect, it } from 'vitest'

import type { ShellRoute } from '@/app/navigation/shellRoute'

import { resolveBreadcrumb } from './breadcrumbResolver'

describe('resolveBreadcrumb', () => {
	it('projects section 生成项目总览节点', () => {
		expect(
			resolveBreadcrumb({ route: createRoute({ kind: 'shell-section', section: 'projects' }) }),
		).toMatchObject([{ label: '项目总览', current: true, to: '/all/projects' }])
	})

	it('project detail 生成项目总览到项目详情', () => {
		expect(
			resolveBreadcrumb({
				route: createRoute({
					kind: 'project',
					scope: { type: 'space', spaceId: 'space-1' },
					spaceId: 'space-1',
					projectId: 'project-1',
				}),
				projectDetail: {
					id: 'project-1',
					name: '项目 A',
				},
			}),
		).toMatchObject([
			{ label: '项目总览', current: false, to: '/space-1/projects' },
			{ label: '项目 A', current: true },
		])
	})

	it('project task detail 生成项目链路', () => {
		expect(
			resolveBreadcrumb({
				route: createRoute({
					kind: 'task',
					scope: { type: 'space', spaceId: 'space-1' },
					spaceId: 'space-1',
					taskId: 'task-1',
				}),
				taskDetail: {
					id: 'task-1',
					title: '任务 A',
					projectId: 'project-1',
					projectName: '项目 A',
					inboxAt: null,
				},
			}),
		).toMatchObject([
			{ label: '项目总览', to: '/space-1/projects' },
			{ label: '项目 A', to: '/space-1/projects/project-1' },
			{ label: '任务 A', current: true },
		])
	})

	it('inbox task detail 生成收件箱链路', () => {
		expect(
			resolveBreadcrumb({
				route: createRoute({
					kind: 'task',
					scope: { type: 'space', spaceId: 'space-1' },
					spaceId: 'space-1',
					taskId: 'task-1',
				}),
				taskDetail: {
					id: 'task-1',
					title: '任务 A',
					projectId: null,
					projectName: null,
					inboxAt: '2026-05-01T00:00:00Z',
				},
			}),
		).toMatchObject([
			{ label: '收件箱', to: '/space-1/inbox' },
			{ label: '任务 A', current: true },
		])
	})

	it('no-project task detail 生成独立事项链路', () => {
		expect(
			resolveBreadcrumb({
				route: createRoute({
					kind: 'task',
					scope: { type: 'space', spaceId: 'space-1' },
					spaceId: 'space-1',
					taskId: 'task-1',
				}),
				taskDetail: {
					id: 'task-1',
					title: '任务 A',
					projectId: null,
					projectName: null,
					inboxAt: null,
				},
			}),
		).toMatchObject([
			{ label: '独立事项', to: '/space-1/no-project' },
			{ label: '任务 A', current: true },
		])
	})

	it('view detail 生成视图到具体视图', () => {
		expect(
			resolveBreadcrumb({
				route: createRoute({
					kind: 'view',
					scope: { type: 'all' },
					viewId: 'today',
				}),
				viewName: 'Today',
			}),
		).toMatchObject([
			{ label: '视图', to: '/all/views', current: false },
			{ label: 'Today', current: true },
		])
	})

	it('trash section 复用统一的 section 文案', () => {
		expect(
			resolveBreadcrumb({
				route: createRoute({ kind: 'shell-section', section: 'trash' }),
			}),
		).toMatchObject([{ label: '回收站', current: true, to: '/all/trash' }])
	})

	it('缺少名称时使用兜底文案', () => {
		expect(
			resolveBreadcrumb({
				route: createRoute({
					kind: 'project',
					scope: { type: 'space', spaceId: 'space-1' },
					spaceId: 'space-1',
					projectId: 'project-1',
				}),
				projectDetail: {
					id: 'project-1',
					name: '',
				},
			}),
		).toMatchObject([{ label: '项目总览' }, { label: '项目详情' }])

		expect(
			resolveBreadcrumb({
				route: createRoute({
					kind: 'task',
					scope: { type: 'space', spaceId: 'space-1' },
					spaceId: 'space-1',
					taskId: 'task-1',
				}),
				taskDetail: {
					id: 'task-1',
					title: '',
					projectId: null,
					projectName: null,
					inboxAt: null,
				},
			}),
		).toMatchObject([{ label: '独立事项' }, { label: '任务详情' }])

		expect(
			resolveBreadcrumb({
				route: createRoute({
					kind: 'view',
					scope: { type: 'all' },
					viewId: 'today',
				}),
				viewName: '',
			}),
		).toMatchObject([{ label: '视图', current: true }])
	})
})

function createRoute(overrides: Partial<ShellRoute>): ShellRoute {
	return {
		appRoute: { kind: 'unknown', pathname: '/', search: '', hash: '', fullPath: '/' },
		kind: 'shell-section',
		scope: { type: 'all' },
		spaceId: null,
		section: 'inbox',
		settingsSection: null,
		viewId: null,
		projectId: null,
		taskId: null,
		pathname: '/',
		search: '',
		hash: '',
		fullPath: '/',
		isShellPath: false,
		isSettingsPath: false,
		isDebugPath: false,
		isQuickCreatePath: false,
		isWorkPath: false,
		...overrides,
	} as ShellRoute
}
