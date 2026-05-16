import { render, renderHook, screen } from '@testing-library/react'

import type { CommandSelectionContext } from '@/features/command/core'

import {
	CommandSelectionProvider,
	useCommandSelectionContext,
	useRegisterCommandSelection,
} from './CommandSelectionProvider'

describe('CommandSelectionProvider', () => {
	it('默认返回空 selection', () => {
		const { result } = renderHook(() => useCommandSelectionContext(), {
			wrapper: CommandSelectionProvider,
		})

		expect(result.current).toMatchObject({
			ids: [],
			entities: [],
			source: 'none',
			hasSelection: false,
			isSingleSelection: false,
			isMultiSelection: false,
		})
	})

	it('注册 task selection 后返回有效 ids、entities、primaryEntity 和 source', () => {
		render(
			<CommandSelectionProvider>
				<SelectionRegistrar selection={createTaskSelection(['task-a', 'task-b'])} />
				<SelectionProbe />
			</CommandSelectionProvider>,
		)

		expect(screen.getByTestId('selection-json')).toHaveTextContent(
			JSON.stringify({
				ids: ['task-a', 'task-b'],
				entities: [
					{ id: 'task-a', type: 'task', title: '任务 task-a' },
					{ id: 'task-b', type: 'task', title: '任务 task-b' },
				],
				primaryEntity: { id: 'task-a', type: 'task', title: '任务 task-a' },
				source: 'task-list',
				hasSelection: true,
				isSingleSelection: false,
				isMultiSelection: true,
			}),
		)
	})

	it('注册空 selection 后恢复空状态', () => {
		render(
			<CommandSelectionProvider>
				<SelectionRegistrar selection={createTaskSelection([])} />
				<SelectionProbe />
			</CommandSelectionProvider>,
		)

		expect(screen.getByTestId('selection-json')).toHaveTextContent(
			JSON.stringify({
				ids: [],
				entities: [],
				source: 'none',
				hasSelection: false,
				isSingleSelection: false,
				isMultiSelection: false,
			}),
		)
	})

	it('注册组件卸载后自动清空 selection', () => {
		function Harness({ show }: { show: boolean }) {
			return (
				<CommandSelectionProvider>
					{show ? <SelectionRegistrar selection={createTaskSelection(['task-a'])} /> : null}
					<SelectionProbe />
				</CommandSelectionProvider>
			)
		}

		const { rerender } = render(<Harness show />)

		expect(screen.getByTestId('selection-json').textContent).toContain('"hasSelection":true')

		rerender(<Harness show={false} />)

		expect(screen.getByTestId('selection-json').textContent).toContain('"hasSelection":false')
	})
})

function SelectionRegistrar({ selection }: { selection: CommandSelectionContext }) {
	useRegisterCommandSelection(selection)
	return null
}

function SelectionProbe() {
	const selection = useCommandSelectionContext()
	const visibleSelection = {
		ids: selection.ids,
		entities: selection.entities,
		primaryEntity: selection.primaryEntity,
		source: selection.source,
		hasSelection: selection.hasSelection,
		isSingleSelection: selection.isSingleSelection,
		isMultiSelection: selection.isMultiSelection,
	}

	return <output data-testid='selection-json'>{JSON.stringify(visibleSelection)}</output>
}

function createTaskSelection(ids: string[]): CommandSelectionContext {
	const entities = ids.map((id) => ({
		id,
		type: 'task' as const,
		title: `任务 ${id}`,
	}))

	return {
		type: ids.length > 0 ? 'task' : undefined,
		ids,
		entities,
		primaryEntity: entities[0],
		source: ids.length > 0 ? 'task-list' : 'none',
		hasSelection: ids.length > 0,
		isSingleSelection: ids.length === 1,
		isMultiSelection: ids.length > 1,
	}
}
