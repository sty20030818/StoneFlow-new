import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AutosaveController } from '@/shared/autosave'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskPropertiesSection } from './TaskPropertiesSection'

describe('TaskPropertiesSection', () => {
	it('渲染描边属性入口组', () => {
		const { container } = render(<TaskPropertiesSection autosave={createAutosaveController()} />)

		expect(container.querySelector('[data-task-properties="stack"]')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '状态' })).toHaveTextContent('待执行')
		expect(screen.getByRole('button', { name: '优先级' })).toHaveTextContent('中')
		expect(screen.getByRole('button', { name: '截止日期' })).toHaveAttribute(
			'data-variant',
			'outline',
		)
		expect(screen.getByRole('button', { name: '计划日期' })).toHaveAttribute(
			'data-variant',
			'outline',
		)
		expect(screen.getByRole('button', { name: '提醒' })).toHaveAttribute(
			'data-variant',
			'outline',
		)
	})

	it('状态和优先级按钮使用 outline contract', () => {
		render(<TaskPropertiesSection autosave={createAutosaveController()} />)

		expect(screen.getByRole('button', { name: '状态' })).toHaveAttribute('data-variant', 'outline')
		expect(screen.getByRole('button', { name: '优先级' })).toHaveAttribute('data-variant', 'outline')
	})

	it('状态菜单使用统一 dropdown 结构', async () => {
		render(<TaskPropertiesSection autosave={createAutosaveController()} />)

		fireEvent.pointerDown(screen.getByRole('button', { name: '状态' }))

		const menu = await screen.findByRole('menu')
		expect(menu).toHaveAttribute('data-drawer-owned-overlay', 'true')
		expect(screen.getByRole('menuitem', { name: /待执行/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /已完成/ })).toBeInTheDocument()
	})

	it('日期菜单包含统一 preset，空值时不显示移除当前日期，且自定义日期禁用', async () => {
		render(<TaskPropertiesSection autosave={createAutosaveController()} />)

		fireEvent.pointerDown(screen.getByRole('button', { name: '截止日期' }))

		expect(screen.queryByRole('menuitem', { name: /移除当前日期/ })).not.toBeInTheDocument()
		expect(await screen.findByRole('menuitem', { name: /今天/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /今天/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /明天/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /本周/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /一周后/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /自定义日期/ })).toHaveAttribute('data-disabled')
	})
})

function createAutosaveController(): AutosaveController<TaskDetailDraft> {
	return {
		draft: {
			id: 'task-1',
			title: '任务 A',
			note: '',
			status: 'todo',
			priority: 2,
			spaceId: 'space-1',
			projectId: '',
			dueAt: '',
			scheduledAt: '',
			reminderAt: '',
		},
		status: 'idle',
		error: null,
		savedAt: null,
		isDirty: false,
		setField: vi.fn<AutosaveController<TaskDetailDraft>['setField']>(),
		setDraft: vi.fn<AutosaveController<TaskDetailDraft>['setDraft']>(),
		flushNow: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		retry: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
		discard: vi.fn<() => void>(),
		reset: vi.fn<AutosaveController<TaskDetailDraft>['reset']>(),
	}
}
