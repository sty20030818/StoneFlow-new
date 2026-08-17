import { createCollectionFocusBridge } from './collectionFocusBridge'

afterEach(() => {
	document.body.replaceChildren()
})

describe('collectionFocusBridge', () => {
	it('已挂载 item 立即聚焦，并避免浏览器接管滚动', () => {
		const requestScroll = vi.fn()
		const bridge = createCollectionFocusBridge({ requestScroll })
		const item = createFocusableElement()
		const focus = vi.spyOn(item, 'focus')
		bridge.registerItem('task-a', item)

		bridge.requestFocus({ type: 'item', key: 'task-a' })

		expect(focus).toHaveBeenCalledWith({ preventScroll: true })
		expect(requestScroll).not.toHaveBeenCalled()
	})

	it('未挂载 item 先请求滚动，注册真实节点后再聚焦', () => {
		const requestScroll = vi.fn()
		const bridge = createCollectionFocusBridge({ requestScroll })

		bridge.requestFocus({ type: 'item', key: 'task-a' })

		expect(requestScroll).toHaveBeenCalledTimes(1)
		expect(requestScroll).toHaveBeenCalledWith('task-a')

		const item = createFocusableElement()
		const focus = vi.spyOn(item, 'focus')
		bridge.registerItem('task-a', item)

		expect(focus).toHaveBeenCalledWith({ preventScroll: true })
	})

	it('只兑现最后一次 focus intent，旧虚拟行挂载不会夺回焦点', () => {
		const requestScroll = vi.fn()
		const bridge = createCollectionFocusBridge({ requestScroll })
		const first = createFocusableElement()
		const second = createFocusableElement()
		const focusFirst = vi.spyOn(first, 'focus')
		const focusSecond = vi.spyOn(second, 'focus')

		bridge.requestFocus({ type: 'item', key: 'task-a' })
		bridge.requestFocus({ type: 'item', key: 'task-b' })
		bridge.registerItem('task-a', first)
		bridge.registerItem('task-b', second)

		expect(requestScroll.mock.calls).toEqual([['task-a'], ['task-b']])
		expect(focusFirst).not.toHaveBeenCalled()
		expect(focusSecond).toHaveBeenCalledWith({ preventScroll: true })
	})

	it('分别等待 group button 与 collection root 注册，不为它们请求 item 滚动', () => {
		const requestScroll = vi.fn()
		const bridge = createCollectionFocusBridge({ requestScroll })
		const groupButton = createFocusableElement('button')
		const root = createFocusableElement()
		const focusGroup = vi.spyOn(groupButton, 'focus')
		const focusRoot = vi.spyOn(root, 'focus')

		bridge.requestFocus({
			type: 'group-trigger',
			groupKey: 'status-todo',
			reentry: { type: 'root' },
		})
		bridge.registerGroupTrigger('status-todo', groupButton)
		expect(focusGroup).toHaveBeenCalledWith({ preventScroll: true })

		bridge.requestFocus({ type: 'root' })
		bridge.registerRoot(root)
		expect(focusRoot).toHaveBeenCalledWith({ preventScroll: true })
		expect(requestScroll).not.toHaveBeenCalled()
	})

	it('旧节点 cleanup 不会移除同 key 的新节点', () => {
		const bridge = createCollectionFocusBridge({ requestScroll: vi.fn() })
		const oldItem = createFocusableElement()
		const nextItem = createFocusableElement()
		const focusOld = vi.spyOn(oldItem, 'focus')
		const focusNext = vi.spyOn(nextItem, 'focus')
		const cleanupOld = bridge.registerItem('task-a', oldItem)
		bridge.registerItem('task-a', nextItem)

		cleanupOld()
		bridge.requestFocus({ type: 'item', key: 'task-a' })

		expect(focusOld).not.toHaveBeenCalled()
		expect(focusNext).toHaveBeenCalledWith({ preventScroll: true })
	})

	it('只把真实注册 row 解析为 key，不把行内控件当成 collection item', () => {
		const bridge = createCollectionFocusBridge({ requestScroll: vi.fn() })
		const item = createFocusableElement()
		const inlineButton = document.createElement('button')
		item.append(inlineButton)
		const cleanup = bridge.registerItem('task-a', item)

		expect(bridge.getItemKey(item)).toBe('task-a')
		expect(bridge.getItemKey(inlineButton)).toBeNull()

		cleanup()
		expect(bridge.getItemKey(item)).toBeNull()
	})

	it('旧 root cleanup 不会移除后来注册的 collection root', () => {
		const bridge = createCollectionFocusBridge({ requestScroll: vi.fn() })
		const oldRoot = createFocusableElement()
		const nextRoot = createFocusableElement()
		const focusOld = vi.spyOn(oldRoot, 'focus')
		const focusNext = vi.spyOn(nextRoot, 'focus')
		const cleanupOld = bridge.registerRoot(oldRoot)
		bridge.registerRoot(nextRoot)

		cleanupOld()
		bridge.requestFocus({ type: 'root' })

		expect(focusOld).not.toHaveBeenCalled()
		expect(focusNext).toHaveBeenCalledWith({ preventScroll: true })
	})

	it('trigger 只保存 stable key，并由调用方传入删除后的 fallback intent', () => {
		const bridge = createCollectionFocusBridge({ requestScroll: vi.fn() })
		const root = createFocusableElement()
		const focusRoot = vi.spyOn(root, 'focus')
		bridge.registerRoot(root)
		bridge.rememberTrigger('task-deleted')

		expect(bridge.getTriggerKey()).toBe('task-deleted')

		bridge.restoreTrigger({ type: 'root' })

		expect(focusRoot).toHaveBeenCalledWith({ preventScroll: true })
		expect(bridge.getTriggerKey()).toBeNull()
	})

	it('虚拟 trigger 恢复只使用 stable key，异步挂载后聚焦真实行', () => {
		const requestScroll = vi.fn()
		const bridge = createCollectionFocusBridge({ requestScroll })
		bridge.rememberTrigger('task-a')
		const triggerKey = bridge.getTriggerKey()

		expect(triggerKey).toBe('task-a')
		bridge.restoreTrigger({ type: 'item', key: triggerKey! })
		expect(requestScroll).toHaveBeenCalledWith('task-a')

		const restoredItem = createFocusableElement()
		const focus = vi.spyOn(restoredItem, 'focus')
		bridge.registerItem('task-a', restoredItem)

		expect(focus).toHaveBeenCalledWith({ preventScroll: true })
		expect(bridge.getTriggerKey()).toBeNull()
	})

	it('删除 fallback 会覆盖旧 item intent，迟到节点不能夺焦点', () => {
		const requestScroll = vi.fn()
		const bridge = createCollectionFocusBridge({ requestScroll })
		const root = createFocusableElement()
		const deletedItem = createFocusableElement()
		const focusRoot = vi.spyOn(root, 'focus')
		const focusDeleted = vi.spyOn(deletedItem, 'focus')
		bridge.registerRoot(root)

		bridge.requestFocus({ type: 'item', key: 'task-deleted' })
		bridge.requestFocus({ type: 'root' })
		bridge.registerItem('task-deleted', deletedItem)

		expect(focusRoot).toHaveBeenCalledWith({ preventScroll: true })
		expect(focusDeleted).not.toHaveBeenCalled()
	})
})

function createFocusableElement(tagName: 'button' | 'div' = 'div') {
	const element = document.createElement(tagName)
	if (tagName === 'div') {
		element.tabIndex = -1
	}
	document.body.append(element)
	return element
}
