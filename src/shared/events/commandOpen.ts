import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'

import { useLatestRef } from '@/shared/lib/useLatestRef'

export const COMMAND_OPEN_EVENT = 'stoneflow://command/open'

export type CommandOpenPayload = {
	kind: 'task' | 'project'
	id: string
	spaceId: string
	projectId: string | null
	placement: 'project' | 'inbox' | 'no_project'
}

type RawCommandOpenPayload = {
	kind?: unknown
	id?: unknown
	space_id?: unknown
	project_id?: unknown
	placement?: unknown
}

export function normalizeCommandOpenPayload(payload: unknown): CommandOpenPayload | null {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	const candidate = payload as RawCommandOpenPayload
	if (
		(candidate.kind !== 'task' && candidate.kind !== 'project') ||
		typeof candidate.id !== 'string' ||
		typeof candidate.space_id !== 'string'
	) {
		return null
	}

	return {
		kind: candidate.kind,
		id: candidate.id,
		spaceId: candidate.space_id,
		projectId: typeof candidate.project_id === 'string' ? candidate.project_id : null,
		placement:
			candidate.placement === 'project' ||
			candidate.placement === 'inbox' ||
			candidate.placement === 'no_project'
				? candidate.placement
				: typeof candidate.project_id === 'string'
					? 'project'
					: 'no_project',
	}
}

export function subscribeToCommandOpen(onCommandOpen: (payload: CommandOpenPayload) => void) {
	let disposed = false
	let unlisten: (() => void) | null = null

	void listen<unknown>(COMMAND_OPEN_EVENT, (event) => {
		const payload = normalizeCommandOpenPayload(event.payload)
		if (!payload) return
		onCommandOpen(payload)
	})
		.then((nextUnlisten) => {
			if (disposed) {
				nextUnlisten()
				return
			}
			unlisten = nextUnlisten
		})
		.catch((error) => {
			console.error('command open listener failed', { error })
		})

	return () => {
		disposed = true
		unlisten?.()
		unlisten = null
	}
}

export function useCommandOpenListener(onCommandOpen: (payload: CommandOpenPayload) => void) {
	const onCommandOpenRef = useLatestRef(onCommandOpen)

	useEffect(
		() => subscribeToCommandOpen((payload) => onCommandOpenRef.current(payload)),
		[onCommandOpenRef],
	)
}
