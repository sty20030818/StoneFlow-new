import { invoke } from '@tauri-apps/api/core'

import { deleteProject, restoreProject } from '@/features/project/api/projects'
import { deleteSpace, restoreSpace } from '@/features/space/api/spaces'
import { deleteTask, restoreTask } from '@/features/task/api/tasks'
import type {
	LifecycleEntry,
	LifecycleEntityType,
	ListLifecycleEntriesInput,
	Scope,
} from '@/shared/types'

type LifecycleScopePayload =
	| {
			type: 'all'
	  }
	| {
			type: 'space'
			spaceId: string
	  }

function toScopePayload(scope: Scope): LifecycleScopePayload {
	return scope.type === 'all' ? { type: 'all' } : { type: 'space', spaceId: scope.spaceId }
}

function toListPayload(input: Omit<ListLifecycleEntriesInput, 'mode'>) {
	return {
		scope: toScopePayload(input.scope),
		entityFilter: input.entityFilter ?? null,
	}
}

export async function listLifecycleEntries(input: ListLifecycleEntriesInput) {
	return invoke<LifecycleEntry[]>(
		input.mode === 'archive' ? 'list_archive_entries' : 'list_trash_entries',
		{
			input: toListPayload(input),
		},
	)
}

export async function deleteLifecycleEntry(entry: LifecycleEntry) {
	switch (entry.entityType) {
		case 'space':
			return deleteSpace(entry.id)
		case 'project':
			return deleteProject(entry.id)
		case 'task':
			return deleteTask(entry.id)
	}
}

export async function restoreLifecycleEntry(entry: LifecycleEntry) {
	switch (entry.entityType) {
		case 'space':
			return restoreSpace(entry.id)
		case 'project':
			return restoreProject(entry.id)
		case 'task':
			return restoreTask(entry.id)
	}
}

export async function permanentlyDeleteLifecycleEntry(entry: LifecycleEntry) {
	const commandByType: Record<LifecycleEntityType, string> = {
		space: 'permanently_delete_space',
		project: 'permanently_delete_project',
		task: 'permanently_delete_task',
	}

	return invoke<void>(commandByType[entry.entityType], {
		input:
			entry.entityType === 'space'
				? { spaceId: entry.id }
				: entry.entityType === 'project'
					? { projectId: entry.id }
					: { taskId: entry.id },
	})
}
