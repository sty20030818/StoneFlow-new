import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AutosaveController } from '@/shared/autosave'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { TaskPropertiesSection } from './TaskPropertiesSection'

vi.mock('@/shared/ui/base/select', () => {
	type SelectItemProps = {
		value: string
		children: React.ReactNode
	}

	function SelectItem(_props: SelectItemProps) {
		return null
	}

	function collectItems(children: React.ReactNode): SelectItemProps[] {
		const items: SelectItemProps[] = []

		React.Children.forEach(children, (child) => {
			if (!React.isValidElement(child)) {
				return
			}

			if (child.type === SelectItem) {
				items.push((child as React.ReactElement<SelectItemProps>).props)
				return
			}

			const nestedChildren = (child as React.ReactElement<{ children?: React.ReactNode }>).props
				.children
			if (nestedChildren) {
				items.push(...collectItems(nestedChildren))
			}
		})

		return items
	}

	function MockSelectTrigger({ children }: { children?: React.ReactNode }) {
		return <>{children}</>
	}

	return {
		Select: ({
			value,
			onValueChange,
			children,
		}: {
			value?: string
			onValueChange?: (value: string) => void
			children: React.ReactNode
		}) => (
			<select
				aria-label={getTriggerLabel(children)}
				onChange={(event) => onValueChange?.(event.currentTarget.value)}
				value={value}
			>
				{collectItems(children).map((item) => (
					<option key={item.value} value={item.value}>
						{item.children}
					</option>
				))}
			</select>
		),
		SelectTrigger: MockSelectTrigger,
		SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		SelectGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
		SelectItem,
	}

	function getTriggerLabel(children: React.ReactNode) {
		const trigger = React.Children.toArray(children).find(
			(child) => React.isValidElement(child) && child.type === MockSelectTrigger,
		)

		if (!React.isValidElement(trigger)) {
			return undefined
		}

		return (trigger.props as { 'aria-label'?: string })['aria-label']
	}

})

describe('TaskPropertiesSection', () => {
	it('渲染描边属性入口组', () => {
		const { container } = render(<TaskPropertiesSection autosave={createAutosaveController()} />)

		expect(container.querySelector('[data-task-properties="button-group"]')).toBeInTheDocument()
		expect(screen.getByText('待执行')).toBeInTheDocument()
		expect(screen.getByText('中')).toBeInTheDocument()
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

	it('状态和优先级选择立即保存', () => {
		const autosave = createAutosaveController()
		render(<TaskPropertiesSection autosave={autosave} />)

		fireEvent.change(screen.getByLabelText('状态'), { target: { value: 'doing' } })
		fireEvent.change(screen.getByLabelText('优先级'), { target: { value: '4' } })

		expect(autosave.setField).toHaveBeenCalledWith('status', 'doing', { saveMode: 'immediate' })
		expect(autosave.setField).toHaveBeenCalledWith('priority', 4, { saveMode: 'immediate' })
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
