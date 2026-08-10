import { SHORTCUT_DISPATCH_PRIORITY, ShortcutDispatcher } from './shortcut-dispatcher'

describe('ShortcutDispatcher', () => {
	it('按 row、list、global 顺序分发，并在 handled 后停止', () => {
		const dispatcher = new ShortcutDispatcher()
		const calls: string[] = []
		const event = new KeyboardEvent('keydown', { key: 'Escape' })

		dispatcher.register(SHORTCUT_DISPATCH_PRIORITY.global, () => {
			calls.push('global')
			return 'handled'
		})
		dispatcher.register(SHORTCUT_DISPATCH_PRIORITY.list, () => {
			calls.push('list')
			return 'handled'
		})
		dispatcher.register(SHORTCUT_DISPATCH_PRIORITY.row, () => {
			calls.push('row')
			return 'unhandled'
		})

		expect(dispatcher.dispatch(event)).toBe('handled')
		expect(calls).toEqual(['row', 'list'])
	})

	it('高优先级均未消费时下沉到 global', () => {
		const dispatcher = new ShortcutDispatcher()
		const calls: string[] = []
		const event = new KeyboardEvent('keydown', { key: 'Escape' })

		for (const [name, priority] of [
			['global', SHORTCUT_DISPATCH_PRIORITY.global],
			['list', SHORTCUT_DISPATCH_PRIORITY.list],
			['row', SHORTCUT_DISPATCH_PRIORITY.row],
		] as const) {
			dispatcher.register(priority, () => {
				calls.push(name)
				return name === 'global' ? 'handled' : 'unhandled'
			})
		}

		expect(dispatcher.dispatch(event)).toBe('handled')
		expect(calls).toEqual(['row', 'list', 'global'])
	})

	it('global chord pending 时跳过 row/list，只把第二键交给 global', () => {
		const dispatcher = new ShortcutDispatcher()
		const calls: string[] = []
		const event = new KeyboardEvent('keydown', { key: 'p' })

		for (const [name, priority] of [
			['global', SHORTCUT_DISPATCH_PRIORITY.global],
			['list', SHORTCUT_DISPATCH_PRIORITY.list],
			['row', SHORTCUT_DISPATCH_PRIORITY.row],
		] as const) {
			dispatcher.register(priority, () => {
				calls.push(name)
				return 'handled'
			})
		}

		expect(dispatcher.dispatch(event, { globalChordPending: true })).toBe('handled')
		expect(calls).toEqual(['global'])
	})

	it('注销后不再调用对应 handler', () => {
		const dispatcher = new ShortcutDispatcher()
		const handler = vi.fn(() => 'handled' as const)
		const unregister = dispatcher.register(SHORTCUT_DISPATCH_PRIORITY.row, handler)

		unregister()

		expect(dispatcher.dispatch(new KeyboardEvent('keydown', { key: 'x' }))).toBe('unhandled')
		expect(handler).not.toHaveBeenCalled()
	})
})
