import { fireEvent, render, screen } from '@testing-library/react'
import { useMemo, type KeyboardEventHandler } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useCollectionInteraction } from '../model/useCollectionInteraction'
import { createCollectionFocusBridge } from '../model/collectionFocusBridge'
import { useCollectionKeyboardAdapter } from './useCollectionKeyboardAdapter'

describe('useCollectionKeyboardAdapter', () => {
	it('统一处理 Arrow/Home/End 与 J/K，并集中处理 Shift 逐项切换', () => {
		const onReactAriaKeyDown = vi.fn()
		render(<CollectionProbe onReactAriaKeyDown={onReactAriaKeyDown} />)

		const root = screen.getByTestId('collection-root')
		const rowA = screen.getByTestId('row-task-a')
		const rowB = screen.getByTestId('row-task-b')
		const rowC = screen.getByTestId('row-task-c')

		expect(fireEvent.keyDown(root, { key: 'j' })).toBe(false)
		expect(screen.getByTestId('focused-key')).toHaveTextContent('task-a')
		expect(rowA).toHaveFocus()

		fireEvent.keyDown(rowA, { key: 'j' })
		expect(screen.getByTestId('focused-key')).toHaveTextContent('task-b')
		expect(rowB).toHaveFocus()

		fireEvent.keyDown(rowB, { key: 'k' })
		expect(screen.getByTestId('focused-key')).toHaveTextContent('task-a')
		fireEvent.keyDown(rowA, { key: 'j' })

		fireEvent.keyDown(rowB, { key: 'j', shiftKey: true })
		expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-b')
		expect(screen.getByTestId('focused-key')).toHaveTextContent('task-b')
		fireEvent.keyDown(rowB, { key: 'j', shiftKey: true })
		expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-b,task-c')
		expect(screen.getByTestId('focused-key')).toHaveTextContent('task-c')

		fireEvent.keyDown(rowC, { key: 'k', shiftKey: true })
		expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-b')
		fireEvent.keyDown(rowB, { key: 'ArrowDown', shiftKey: true })
		expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-b,task-c')

		expect(fireEvent.keyDown(rowC, { key: 'Home' })).toBe(false)
		expect(rowA).toHaveFocus()
		expect(fireEvent.keyDown(rowA, { key: 'End' })).toBe(false)
		expect(rowC).toHaveFocus()
		expect(fireEvent.keyDown(rowC, { key: 'ArrowUp' })).toBe(false)
		expect(rowB).toHaveFocus()
		expect(onReactAriaKeyDown).not.toHaveBeenCalled()
	})

	it('从已选区中间开始 Shift 时逐行取消，反向时先恢复上一行', () => {
		render(
			<CollectionProbe
				defaultSelectedKeys={['task-a', 'task-b', 'task-c', 'task-d', 'task-e']}
				eligibleKeys={['task-a', 'task-b', 'task-c', 'task-d', 'task-e']}
			/>,
		)

		const rowC = screen.getByTestId('row-task-c')
		const rowD = screen.getByTestId('row-task-d')
		fireEvent.pointerMove(rowC)

		fireEvent.keyDown(rowC, { key: 'ArrowDown', shiftKey: true })
		expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-a,task-b,task-d,task-e')
		expect(rowC).toHaveFocus()

		fireEvent.keyDown(rowC, { key: 'ArrowDown', shiftKey: true })
		expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-a,task-b,task-e')
		expect(rowD).toHaveFocus()

		fireEvent.keyDown(rowD, { key: 'ArrowUp', shiftKey: true })
		expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-a,task-b,task-d,task-e')
		expect(rowD).toHaveFocus()
	})

	it('普通边界导航也会结束上一段 Shift 手势', () => {
		render(<CollectionProbe eligibleKeys={['task-a']} />)
		const row = screen.getByTestId('row-task-a')
		fireEvent.pointerMove(row)

		fireEvent.keyDown(row, { key: 'ArrowDown', shiftKey: true })
		expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-a')

		fireEvent.keyDown(row, { key: 'ArrowDown' })
		fireEvent.keyDown(row, { key: 'ArrowDown', shiftKey: true })
		expect(screen.getByTestId('selected-keys')).toHaveTextContent('none')
	})

	it('丢弃积压或过密的系统 repeat，新的离散按键仍立即执行', () => {
		const eligibleKeys = Array.from({ length: 20 }, (_, index) => `task-${index}`)
		const now = vi.spyOn(performance, 'now').mockReturnValue(1_000)
		render(<CollectionProbe eligibleKeys={eligibleKeys} />)

		const rowA = screen.getByTestId('row-task-0')
		const rowB = screen.getByTestId('row-task-1')
		const rowC = screen.getByTestId('row-task-2')
		fireEvent.pointerMove(rowA)
		fireEvent.keyDown(rowA, { key: 'ArrowDown' })
		expect(rowB).toHaveFocus()

		for (let index = 0; index < 12; index += 1) {
			fireEvent.keyDown(document.activeElement ?? rowB, {
				key: 'ArrowDown',
				repeat: true,
			})
		}
		expect(rowC).toHaveFocus()

		const staleRepeat = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			key: 'ArrowUp',
			repeat: true,
		})
		Object.defineProperty(staleRepeat, 'timeStamp', { value: 800 })
		fireEvent(rowC, staleRepeat)
		expect(rowC).toHaveFocus()

		fireEvent.keyDown(rowC, { key: 'ArrowUp' })
		expect(rowB).toHaveFocus()
		now.mockRestore()
	})

	it('只在 row 本体或 root 上处理 X、Space Peek 与 Enter', () => {
		const onOpen = vi.fn<(key: string) => void>()
		const onPeek = vi.fn<(key: string) => void>()
		render(<CollectionProbe onOpen={onOpen} onPeek={onPeek} />)

		const root = screen.getByTestId('collection-root')
		const rowB = screen.getByTestId('row-task-b')
		fireEvent.pointerMove(rowB)
		expect(fireEvent.keyDown(rowB, { key: 'x' })).toBe(false)
		expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-b')

		root.focus()
		expect(root).toHaveFocus()
		expect(fireEvent.keyDown(root, { key: ' ' })).toBe(false)
		expect(rowB).toHaveFocus()
		expect(onPeek).toHaveBeenCalledWith('task-b')
		expect(fireEvent.keyDown(rowB, { key: 'Enter' })).toBe(false)
		expect(onOpen).toHaveBeenCalledWith('task-b')

		expect(
			fireEvent.keyDown(screen.getByRole('button', { name: '操作 task-b' }), { key: 'x' }),
		).toBe(true)
		expect(
			fireEvent.keyDown(screen.getByRole('checkbox', { name: '选择 task-b' }), { key: ' ' }),
		).toBe(true)
		fireEvent.keyDown(screen.getByRole('button', { name: '操作 task-b' }), { key: 'Enter' })

		expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-b')
		expect(onPeek).toHaveBeenCalledTimes(1)
		expect(onOpen).toHaveBeenCalledTimes(1)
	})

	it.each([
		['Meta', { metaKey: true }],
		['Ctrl', { ctrlKey: true }],
	])('%s+A 在 capture 阶段物化按键时已加载 eligible keys', (_, modifier) => {
		const onReactAriaKeyDown = vi.fn()
		const { rerender } = render(
			<CollectionProbe
				eligibleKeys={['task-a', 'task-b']}
				onReactAriaKeyDown={onReactAriaKeyDown}
			/>,
		)
		expect(
			fireEvent.keyDown(screen.getByTestId('collection-root'), {
				key: 'a',
				...modifier,
			}),
		).toBe(false)
		expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-a,task-b')
		expect(onReactAriaKeyDown).not.toHaveBeenCalled()

		rerender(
			<CollectionProbe
				eligibleKeys={['task-a', 'task-b', 'task-c']}
				onReactAriaKeyDown={onReactAriaKeyDown}
			/>,
		)
		expect(screen.getByTestId('selected-keys')).toHaveTextContent('task-a,task-b')
	})

	it('不劫持未注册节点、行内控件、输入/编辑器和 IME composition', () => {
		const onOpen = vi.fn<(key: string) => void>()
		const onPeek = vi.fn<(key: string) => void>()
		render(<CollectionProbe onOpen={onOpen} onPeek={onPeek} />)

		const ignoredEvents: Array<[HTMLElement, KeyboardEventInit]> = [
			[screen.getByTestId('unregistered-child'), { key: 'j' }],
			[screen.getByRole('button', { name: '操作 task-a' }), { key: 'x' }],
			[screen.getByLabelText('输入框'), { key: 'a', metaKey: true }],
			[screen.getByLabelText('文本域'), { key: 'j' }],
			[screen.getByTestId('nested-contenteditable'), { key: 'x' }],
			[screen.getByTestId('editor-widget-child'), { key: 'j' }],
			[screen.getByTestId('aria-textbox'), { key: ' ' }],
			[screen.getByTestId('editor-child'), { key: 'Enter' }],
			[screen.getByTestId('row-task-a'), { key: 'x', isComposing: true }],
		]

		for (const [target, init] of ignoredEvents) {
			expect(fireEvent.keyDown(target, init)).toBe(true)
		}

		expect(screen.getByTestId('focused-key')).toHaveTextContent('none')
		expect(screen.getByTestId('selected-keys')).toHaveTextContent('none')
		expect(onPeek).not.toHaveBeenCalled()
		expect(onOpen).not.toHaveBeenCalled()
	})
})

type CollectionProbeProps = {
	defaultSelectedKeys?: string[]
	eligibleKeys?: string[]
	onOpen?: (key: string) => void
	onPeek?: (key: string) => void
	onReactAriaKeyDown?: KeyboardEventHandler<HTMLDivElement>
}

function CollectionProbe({
	defaultSelectedKeys,
	eligibleKeys = ['task-a', 'task-b', 'task-c'],
	onOpen,
	onPeek,
	onReactAriaKeyDown,
}: CollectionProbeProps) {
	const interaction = useCollectionInteraction({
		defaultSelectedKeys,
		eligibleKeys,
		navigableKeys: eligibleKeys,
	})
	const focusBridge = useMemo(
		() => createCollectionFocusBridge({ requestScroll: () => undefined }),
		[],
	)
	const keyboard = useCollectionKeyboardAdapter({
		interaction,
		resolveRowKey: focusBridge.getItemKey,
		requestFocus: focusBridge.requestFocus,
		onOpen: onOpen ?? noop,
		onPeek: onPeek ?? noop,
		onKeyboardInteraction: noop,
	})

	return (
		<div
			data-testid='collection-root'
			onKeyDown={onReactAriaKeyDown}
			onKeyDownCapture={keyboard.onKeyDownCapture}
			tabIndex={0}
		>
			{eligibleKeys.map((key) => (
				<div
					data-testid={`row-${key}`}
					key={key}
					ref={(element) => (element ? focusBridge.registerItem(key, element) : undefined)}
					tabIndex={-1}
					onPointerMove={() => {
						interaction.focusKey(key)
						focusBridge.requestFocus({ type: 'item', key })
					}}
				>
					<button type='button'>操作 {key}</button>
					<input aria-label={`选择 ${key}`} type='checkbox' />
					{key === 'task-a' ? <EditableTargets /> : null}
				</div>
			))}
			<span data-testid='unregistered-child' />
			<output data-testid='focused-key'>{interaction.focusedKey ?? 'none'}</output>
			<output data-testid='selected-keys'>
				{[...interaction.selectedKeys].join(',') || 'none'}
			</output>
		</div>
	)
}

function noop() {}

function EditableTargets() {
	return (
		<>
			<input aria-label='输入框' />
			<textarea aria-label='文本域' />
			<div contentEditable suppressContentEditableWarning>
				<span data-testid='nested-contenteditable'>编辑内容</span>
			</div>
			<div data-testid='aria-textbox' role='textbox' />
			<div data-editor>
				<span data-testid='editor-child' />
				<span contentEditable={false}>
					<span data-testid='editor-widget-child' />
				</span>
			</div>
		</>
	)
}
