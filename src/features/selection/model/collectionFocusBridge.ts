import type { CollectionFocusIntent, CollectionKey } from './collectionState'

type CollectionBridgeFocusIntent = CollectionFocusIntent<CollectionKey, CollectionKey>

type CollectionFocusBridgeOptions = {
	requestScroll: (key: CollectionKey) => void
}

type PendingFocusRequest = {
	id: number
	intent: CollectionBridgeFocusIntent
}

/**
 * 连接逻辑 collection 与真实 DOM 焦点。
 *
 * bridge 不判断 key 是否仍属于 collection；筛选、删除与折叠后的 fallback
 * 必须由纯模型生成新的 intent，避免把虚拟卸载误当成实体删除。
 */
export function createCollectionFocusBridge({ requestScroll }: CollectionFocusBridgeOptions) {
	const itemElements = new Map<CollectionKey, HTMLElement>()
	const itemKeys = new WeakMap<HTMLElement, CollectionKey>()
	const groupElements = new Map<CollectionKey, HTMLElement>()
	let rootElement: HTMLElement | null = null
	let pendingRequest: PendingFocusRequest | null = null
	let nextRequestId = 0
	let triggerKey: CollectionKey | null = null

	function registerItem(key: CollectionKey, element: HTMLElement) {
		const previousElement = itemElements.get(key)
		if (previousElement && previousElement !== element) {
			itemKeys.delete(previousElement)
		}
		const previousKey = itemKeys.get(element)
		if (previousKey && previousKey !== key && itemElements.get(previousKey) === element) {
			itemElements.delete(previousKey)
		}

		itemElements.set(key, element)
		itemKeys.set(element, key)
		fulfillPendingRequest()

		return () => {
			if (itemElements.get(key) === element) {
				itemElements.delete(key)
			}
			if (itemKeys.get(element) === key) {
				itemKeys.delete(element)
			}
		}
	}

	function getItemKey(target: EventTarget | null) {
		return typeof HTMLElement !== 'undefined' && target instanceof HTMLElement
			? (itemKeys.get(target) ?? null)
			: null
	}

	function registerGroupTrigger(key: CollectionKey, element: HTMLElement) {
		return registerKeyedElement(groupElements, key, element, fulfillPendingRequest)
	}

	function registerRoot(element: HTMLElement) {
		rootElement = element
		fulfillPendingRequest()

		return () => {
			if (rootElement === element) {
				rootElement = null
			}
		}
	}

	function requestFocus(intent: CollectionBridgeFocusIntent) {
		const request: PendingFocusRequest = {
			id: nextRequestId++,
			intent,
		}
		pendingRequest = request

		if (focusIntent(intent)) {
			clearPendingRequest(request)
			return
		}

		if (intent.type === 'item') {
			requestScroll(intent.key)
		}
	}

	function fulfillPendingRequest() {
		const request = pendingRequest
		if (!request || !focusIntent(request.intent)) {
			return
		}

		clearPendingRequest(request)
	}

	function clearPendingRequest(request: PendingFocusRequest) {
		if (pendingRequest?.id === request.id) {
			pendingRequest = null
		}
	}

	function focusIntent(intent: CollectionBridgeFocusIntent) {
		const element = resolveElement(intent)
		if (!element?.isConnected) {
			return false
		}

		element.focus({ preventScroll: true })
		return true
	}

	function resolveElement(intent: CollectionBridgeFocusIntent) {
		switch (intent.type) {
			case 'item':
				return itemElements.get(intent.key) ?? null
			case 'group-trigger':
				return groupElements.get(intent.groupKey) ?? null
			case 'root':
				return rootElement
		}
	}

	function rememberTrigger(key: CollectionKey) {
		triggerKey = key
	}

	function getTriggerKey() {
		return triggerKey
	}

	function restoreTrigger(intent: CollectionBridgeFocusIntent) {
		triggerKey = null
		requestFocus(intent)
	}

	return {
		registerItem,
		getItemKey,
		registerGroupTrigger,
		registerRoot,
		requestFocus,
		rememberTrigger,
		getTriggerKey,
		restoreTrigger,
	}
}

function registerKeyedElement(
	registry: Map<CollectionKey, HTMLElement>,
	key: CollectionKey,
	element: HTMLElement,
	onRegister: () => void,
) {
	registry.set(key, element)
	onRegister()

	return () => {
		// 虚拟化可能在旧 ref cleanup 前复用同一个 key；只清理自己注册的节点。
		if (registry.get(key) === element) {
			registry.delete(key)
		}
	}
}
