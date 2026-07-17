import type { QuickCreateInput } from '@/features/quick-create/api/quickCreate'
import type { CreateTaskInput, TaskPriority, TaskStatus } from '@/shared/types'

/**
 * QC draft 载荷 → 主窗 `createTask` 同源 CreateTaskInput。
 * placement 规则与 task/create 内核一致：归属 project 时 spaceId 由项目决定（传 null）。
 */
export function mapQuickCreateToTaskInput(input: QuickCreateInput): CreateTaskInput {
	const placementKind = input.placement.kind
	const projectId = input.placement.projectId

	return {
		spaceId: placementKind === 'project' ? null : input.spaceId,
		placement:
			placementKind === 'project'
				? { kind: 'project', projectId: projectId ?? '' }
				: placementKind === 'noProject'
					? { kind: 'noProject' }
					: { kind: 'inbox' },
		title: input.title.trim(),
		note: input.note?.trim() ? input.note.trim() : null,
		status: (input.status as TaskStatus | null) ?? null,
		priority: (input.priority as TaskPriority | null) ?? null,
		dueAt: input.dueAt,
		scheduledAt: input.scheduledAt,
		reminderAt: input.reminderAt,
	}
}
