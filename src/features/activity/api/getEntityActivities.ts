import { invoke } from '@tauri-apps/api/core'

export type ActivityEntityType = 'task' | 'project' | 'space' | 'view' | 'setting'
export type ActivityActorType = 'user' | 'system' | 'ai'
export type ActivitySourceType = 'app' | 'shortcut' | 'command' | 'import' | 'automation'

type GetEntityActivitiesResponse = {
	id: string
	entity_type: ActivityEntityType
	entity_id: string
	action: string
	actor_type: ActivityActorType
	source: ActivitySourceType
	summary: string | null
	metadata: unknown | null
	created_at: string
	changes: Array<{
		id: string
		field: string
		old_value: unknown | null
		new_value: unknown | null
		created_at: string
	}>
}

export type GetEntityActivitiesRequest = {
	entityType: ActivityEntityType
	entityId: string
	limit?: number
}

export type ActivityTimelineChange = {
	id: string
	field: string
	oldValue: unknown | null
	newValue: unknown | null
	createdAt: string
}

export type ActivityTimelineEntry = {
	id: string
	entityType: ActivityEntityType
	entityId: string
	action: string
	actorType: ActivityActorType
	source: ActivitySourceType
	summary: string | null
	metadata: unknown | null
	createdAt: string
	changes: ActivityTimelineChange[]
}

/**
 * 从 Rust 宿主读取某个实体的 Activity timeline。
 */
export async function getEntityActivities({
	entityType,
	entityId,
	limit,
}: GetEntityActivitiesRequest) {
	const payload = await invoke<GetEntityActivitiesResponse[]>('get_entity_activities', {
		input: {
			entity_type: entityType,
			entity_id: entityId,
			limit,
		},
	})

	return payload.map((entry) => ({
		id: entry.id,
		entityType: entry.entity_type,
		entityId: entry.entity_id,
		action: entry.action,
		actorType: entry.actor_type,
		source: entry.source,
		summary: entry.summary,
		metadata: entry.metadata,
		createdAt: entry.created_at,
		changes: entry.changes.map((change) => ({
			id: change.id,
			field: change.field,
			oldValue: change.old_value,
			newValue: change.new_value,
			createdAt: change.created_at,
		})),
	})) satisfies ActivityTimelineEntry[]
}
