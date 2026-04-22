import { useEffect, useEffectEvent } from 'react'
import { listen } from '@tauri-apps/api/event'

export const TASKS_CHANGED_EVENT = 'stoneflow://tasks/changed'

export type TaskChangedPayload = {
	spaceId: string
	spaceSlug: string
	taskId: string
	source: string
	spaceFallback: boolean
}

type RawTaskChangedPayload = {
	space_id?: unknown
	space_slug?: unknown
	task_id?: unknown
	source?: unknown
	space_fallback?: unknown
}

export function normalizeTaskChangedPayload(payload: unknown): TaskChangedPayload | null {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	const candidate = payload as RawTaskChangedPayload
	if (
		typeof candidate.space_id !== 'string' ||
		typeof candidate.space_slug !== 'string' ||
		typeof candidate.task_id !== 'string' ||
		typeof candidate.source !== 'string' ||
		typeof candidate.space_fallback !== 'boolean'
	) {
		return null
	}

	return {
		spaceId: candidate.space_id,
		spaceSlug: candidate.space_slug,
		taskId: candidate.task_id,
		source: candidate.source,
		spaceFallback: candidate.space_fallback,
	}
}

export function isTaskChangedForSpace(payload: TaskChangedPayload, spaceSlug: string) {
	return payload.spaceSlug === spaceSlug
}

export function subscribeToTaskChanged(onTaskChanged: (payload: TaskChangedPayload) => void) {
	let disposed = false
	let unlisten: (() => void) | null = null

	void listen<unknown>(TASKS_CHANGED_EVENT, (event) => {
		const payload = normalizeTaskChangedPayload(event.payload)
		if (!payload) return
		onTaskChanged(payload)
	})
		.then((nextUnlisten) => {
			if (disposed) {
				nextUnlisten()
				return
			}
			unlisten = nextUnlisten
		})
		.catch((error) => {
			console.error('task changed listener failed', { error })
		})

	return () => {
		disposed = true
		unlisten?.()
		unlisten = null
	}
}

export function useTaskChangedListener(
	spaceSlug: string,
	onTaskChanged: (payload: TaskChangedPayload) => void,
) {
	const handleTaskChanged = useEffectEvent((payload: TaskChangedPayload) => {
		if (!isTaskChangedForSpace(payload, spaceSlug)) {
			return
		}

		onTaskChanged(payload)
	})

	useEffect(() => subscribeToTaskChanged(handleTaskChanged), [spaceSlug])
}
