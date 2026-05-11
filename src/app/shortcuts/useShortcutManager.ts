import { useEffect, useRef } from 'react'

import {
	findSequenceBinding,
	findSingleKeyBinding,
	isPrefixExpired,
	isRegisteredPrefix,
	normalizeShortcutKey,
	PREFIX_TIMEOUT_MS,
	shouldIgnoreShortcutEvent,
	type ShortcutBinding,
	type ShortcutId,
	type ShortcutPrefixState,
} from '@/shared/shortcuts'

type UseShortcutManagerOptions = {
	bindings: ShortcutBinding[]
	onTrigger: (id: ShortcutId) => void
}

export function useShortcutManager({ bindings, onTrigger }: UseShortcutManagerOptions) {
	const onTriggerRef = useRef(onTrigger)
	const prefixStateRef = useRef<ShortcutPrefixState | null>(null)
	const timeoutRef = useRef<number | null>(null)

	onTriggerRef.current = onTrigger

	useEffect(() => {
		function clearPrefixState() {
			prefixStateRef.current = null
			if (timeoutRef.current !== null) {
				window.clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}
		}

		function armPrefixTimeout() {
			if (timeoutRef.current !== null) {
				window.clearTimeout(timeoutRef.current)
			}

			timeoutRef.current = window.setTimeout(() => {
				prefixStateRef.current = null
				timeoutRef.current = null
			}, PREFIX_TIMEOUT_MS)
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (shouldIgnoreShortcutEvent(event)) {
				clearPrefixState()
				return
			}

			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault()
				onTriggerRef.current('command.open')
				clearPrefixState()
				return
			}

			if (
				event.key === '/' &&
				!event.metaKey &&
				!event.ctrlKey &&
				!event.altKey
			) {
				event.preventDefault()
				onTriggerRef.current('search.open')
				clearPrefixState()
				return
			}

			const key = normalizeShortcutKey(event)
			if (!key) {
				clearPrefixState()
				return
			}

			const now = performance.now()
			const prefixState = prefixStateRef.current
			if (prefixState && isPrefixExpired(prefixState, now)) {
				clearPrefixState()
			}

			const activePrefix = prefixStateRef.current
			if (activePrefix) {
				const binding = findSequenceBinding(bindings, activePrefix.prefix, key)
				clearPrefixState()
				if (!binding) {
					return
				}

				event.preventDefault()
				onTriggerRef.current(binding.id)
				return
			}

			const singleKeyBinding = findSingleKeyBinding(bindings, key)
			if (singleKeyBinding) {
				event.preventDefault()
				onTriggerRef.current(singleKeyBinding.id)
				return
			}

			if (isRegisteredPrefix(bindings, key)) {
				event.preventDefault()
				prefixStateRef.current = {
					prefix: key,
					startedAt: now,
				}
				armPrefixTimeout()
				return
			}

			clearPrefixState()
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
			clearPrefixState()
		}
	}, [bindings])
}
