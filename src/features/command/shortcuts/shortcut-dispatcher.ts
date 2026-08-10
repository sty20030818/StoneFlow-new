export const SHORTCUT_DISPATCH_PRIORITY = {
	global: 0,
	list: 100,
	row: 200,
} as const

export type ShortcutDispatchPriority =
	(typeof SHORTCUT_DISPATCH_PRIORITY)[keyof typeof SHORTCUT_DISPATCH_PRIORITY]

export type ShortcutDispatchResult = 'handled' | 'unhandled'

export type ShortcutDispatchHandler = (event: KeyboardEvent) => ShortcutDispatchResult

type ShortcutDispatchRegistration = {
	id: number
	priority: ShortcutDispatchPriority
	handler: ShortcutDispatchHandler
}

/**
 * 单一快捷键分发队列。
 *
 * React Provider 只负责 window 生命周期；排序和消费语义留在这个纯对象中，
 * 避免各 scope 依赖 effect 挂载顺序争抢同一个 KeyboardEvent。
 */
export class ShortcutDispatcher {
	private nextRegistrationId = 0
	private readonly registrations = new Map<number, ShortcutDispatchRegistration>()

	register(priority: ShortcutDispatchPriority, handler: ShortcutDispatchHandler) {
		const id = this.nextRegistrationId++
		this.registrations.set(id, { id, priority, handler })

		return () => {
			this.registrations.delete(id)
		}
	}

	dispatch(event: KeyboardEvent, options: { globalChordPending?: boolean } = {}) {
		const registrations = [...this.registrations.values()].sort(
			(left, right) => right.priority - left.priority || left.id - right.id,
		)

		for (const registration of registrations) {
			// chord 第二键属于已进入 pending 的 global 会话；高优先级 scope 此时必须让位。
			if (options.globalChordPending && registration.priority > SHORTCUT_DISPATCH_PRIORITY.global) {
				continue
			}

			if (registration.handler(event) === 'handled') {
				return 'handled' as const
			}
		}

		return 'unhandled' as const
	}
}
