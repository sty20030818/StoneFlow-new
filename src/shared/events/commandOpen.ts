import { useEffect, useEffectEvent } from 'react'
import { listen } from '@tauri-apps/api/event'

export const COMMAND_OPEN_EVENT = 'stoneflow://command/open'

export type CommandOpenPayload = {
	kind: 'task' | 'project'
	id: string
	spaceSlug: string
	projectId: string | null
}

type RawCommandOpenPayload = {
	kind?: unknown
	id?: unknown
	space_slug?: unknown
	project_id?: unknown
}

export function normalizeCommandOpenPayload(payload: unknown): CommandOpenPayload | null {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	const candidate = payload as RawCommandOpenPayload
	if (
		(candidate.kind !== 'task' && candidate.kind !== 'project') ||
		typeof candidate.id !== 'string' ||
		typeof candidate.space_slug !== 'string'
	) {
		return null
	}

	return {
		kind: candidate.kind,
		id: candidate.id,
		spaceSlug: candidate.space_slug,
		projectId: typeof candidate.project_id === 'string' ? candidate.project_id : null,
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
	const handleCommandOpen = useEffectEvent((payload: CommandOpenPayload) => {
		onCommandOpen(payload)
	})

	useEffect(() => subscribeToCommandOpen(handleCommandOpen), [])
}
