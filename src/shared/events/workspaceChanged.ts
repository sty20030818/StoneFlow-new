import { useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'

export const WORKSPACE_CHANGED_EVENT = 'stoneflow://workspace/changed'

export type WorkspaceChangedPayload = {
	source: 'sync'
	reason: string
}

type RawWorkspaceChangedPayload = {
	source?: unknown
	reason?: unknown
}

export function normalizeWorkspaceChangedPayload(payload: unknown): WorkspaceChangedPayload | null {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	const candidate = payload as RawWorkspaceChangedPayload
	if (candidate.source !== 'sync' || typeof candidate.reason !== 'string') {
		return null
	}

	return {
		source: candidate.source,
		reason: candidate.reason,
	}
}

export function subscribeToWorkspaceChanged(
	onWorkspaceChanged: (payload: WorkspaceChangedPayload) => void,
) {
	let disposed = false
	let unlisten: (() => void) | null = null

	void listen<unknown>(WORKSPACE_CHANGED_EVENT, (event) => {
		const payload = normalizeWorkspaceChangedPayload(event.payload)
		if (!payload) return
		onWorkspaceChanged(payload)
	})
		.then((nextUnlisten) => {
			if (disposed) {
				nextUnlisten()
				return
			}
			unlisten = nextUnlisten
		})
		.catch((error) => {
			console.error('workspace changed listener failed', { error })
		})

	return () => {
		disposed = true
		unlisten?.()
		unlisten = null
	}
}

export function useWorkspaceChangedListener(
	onWorkspaceChanged: (payload: WorkspaceChangedPayload) => void,
) {
	const onWorkspaceChangedRef = useRef(onWorkspaceChanged)
	onWorkspaceChangedRef.current = onWorkspaceChanged

	useEffect(
		() =>
			subscribeToWorkspaceChanged((payload) => {
				onWorkspaceChangedRef.current(payload)
			}),
		[],
	)
}
