import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'

import { useLatestRef } from '@/shared/lib/useLatestRef'

export const WORKSPACE_CHANGED_EVENT = 'stoneflow://workspace/changed'

export type WorkspaceChangedDomain = 'tasks' | 'projects' | 'spaces' | 'lifecycle' | 'views'

export type WorkspaceChangedPayload = {
	source: 'sync'
	reason: string
	changedDomains?: WorkspaceChangedDomain[]
}

type RawWorkspaceChangedPayload = {
	source?: unknown
	reason?: unknown
	changedDomains?: unknown
}

const WORKSPACE_CHANGED_DOMAINS = new Set<WorkspaceChangedDomain>([
	'tasks',
	'projects',
	'spaces',
	'lifecycle',
	'views',
])

export function normalizeWorkspaceChangedPayload(payload: unknown): WorkspaceChangedPayload | null {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	const candidate = payload as RawWorkspaceChangedPayload
	if (candidate.source !== 'sync' || typeof candidate.reason !== 'string') {
		return null
	}
	if (
		candidate.changedDomains !== undefined &&
		(!Array.isArray(candidate.changedDomains) ||
			candidate.changedDomains.some((domain) => !WORKSPACE_CHANGED_DOMAINS.has(domain)))
	) {
		return null
	}

	return {
		source: candidate.source,
		reason: candidate.reason,
		changedDomains: candidate.changedDomains as WorkspaceChangedDomain[] | undefined,
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
	const onWorkspaceChangedRef = useLatestRef(onWorkspaceChanged)

	useEffect(
		() =>
			subscribeToWorkspaceChanged((payload) => {
				onWorkspaceChangedRef.current(payload)
			}),
		[onWorkspaceChangedRef],
	)
}
