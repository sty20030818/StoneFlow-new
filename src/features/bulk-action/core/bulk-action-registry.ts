import type { BulkAction, BulkActionId } from './bulk-action.types'

export class BulkActionRegistry {
	private readonly actions = new Map<BulkActionId, BulkAction>()

	constructor(actions: BulkAction[] = []) {
		this.registerMany(actions)
	}

	register(action: BulkAction) {
		// BulkActionId 是批量操作的事实源，重复注册会让执行链路变成双事实。
		if (this.actions.has(action.id)) {
			throw new Error(`Duplicate bulk action id: ${action.id}`)
		}

		this.actions.set(action.id, action)
	}

	registerMany(actions: BulkAction[]) {
		for (const action of actions) {
			this.register(action)
		}
	}

	get(actionId: BulkActionId) {
		return this.actions.get(actionId) ?? null
	}

	getAll() {
		return Array.from(this.actions.values())
	}
}
