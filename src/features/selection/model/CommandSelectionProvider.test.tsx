import { useCallback } from 'react'
import { fireEvent, render, renderHook, screen } from '@testing-library/react'

import type { CommandSelectionContext } from '@/features/command'

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

	it('owner 更新后订阅者和执行入口都读取最新 snapshot', () => {
		const onExecute = vi.fn()

		function Harness({ ids }: { ids: string[] }) {
			return (
				<CommandSelectionProvider>
					<SelectionRegistrar selection={createTaskSelection(ids)} />
					<SelectionProbe />
					<ExecutionProbe onExecute={onExecute} />
				</CommandSelectionProvider>
			)
		}

		const { rerender } = render(<Harness ids={['task-a']} />)
		rerender(<Harness ids={['task-b', 'task-c']} />)

		expect(screen.getByTestId('selection-json').textContent).toContain('"ids":["task-b","task-c"]')
		fireEvent.click(screen.getByRole('button', { name: '执行当前选择' }))
		expect(onExecute).toHaveBeenCalledWith(['task-b', 'task-c'])
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

	it('旧 token 卸载不会清空后来注册的 active source', () => {
		function Harness({ showFirst, showSecond }: { showFirst: boolean; showSecond: boolean }) {
			return (
				<CommandSelectionProvider>
					{showFirst ? (
						<SelectionRegistrar key='first' selection={createTaskSelection(['task-a'])} />
					) : null}
					{showSecond ? (
						<SelectionRegistrar key='second' selection={createTaskSelection(['task-b'])} />
					) : null}
					<SelectionProbe />
				</CommandSelectionProvider>
			)
		}

		const { rerender } = render(<Harness showFirst showSecond />)
		expect(screen.getByTestId('selection-json').textContent).toContain('"ids":["task-b"]')

		rerender(<Harness showFirst={false} showSecond />)
		expect(screen.getByTestId('selection-json').textContent).toContain('"ids":["task-b"]')

		rerender(<Harness showFirst={false} showSecond={false} />)
		expect(screen.getByTestId('selection-json').textContent).toContain('"hasSelection":false')
	})
})

function SelectionRegistrar({ selection }: { selection: CommandSelectionContext }) {
	const readSelection = useCallback(() => selection, [selection])
	useRegisterCommandSelection(readSelection)
	return null
}

function ExecutionProbe({ onExecute }: { onExecute: (ids: string[]) => void }) {
	const selection = useCommandSelectionContext()
	return <button onClick={() => onExecute([...selection.ids])}>执行当前选择</button>
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
