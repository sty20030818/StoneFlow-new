import { z } from 'zod'

import { buildCreatePlacementInput } from '@/features/task/model/taskPlacement'
import type { CreateTaskInput, Scope, Space, TaskPlacement, TaskStatus } from '@/shared/types'
import { optionalTrimmedString, titleString } from '@/shared/validation'

export const taskCreateSchema = z
	.object({
		title: titleString('任务标题'),
		note: optionalTrimmedString,
		priority: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
		spaceId: z.string().trim(),
		placement: z.enum(['project', 'inbox', 'noProject'] satisfies [
			TaskPlacement,
			...TaskPlacement[],
		]),
		projectId: z.string().trim(),
		status: z.enum(['todo', 'doing', 'waiting', 'done', 'canceled'] satisfies [
			TaskStatus,
			...TaskStatus[],
		]),
		dueAt: z.string().nullable(),
		scheduledAt: z.string().nullable(),
		reminderAt: z.string().nullable(),
		createMore: z.boolean(),
	})
	.superRefine((values, ctx) => {
		if (values.placement === 'project' && values.projectId.length === 0) {
			ctx.addIssue({
				code: 'custom',
				path: ['projectId'],
				message: '请选择一个项目，或改为进入收件箱 / 独立事项。',
			})
		}

		if (values.placement !== 'project' && values.spaceId.length === 0) {
			ctx.addIssue({
				code: 'custom',
				path: ['spaceId'],
				message: '当前没有可用 Space，无法创建任务。',
			})
		}
	})

export type TaskCreateFormValues = z.infer<typeof taskCreateSchema>

export function buildTaskCreateDefaultValues(input: {
	currentScope: Scope
	spaces: Space[]
	initialPlacement: TaskPlacement | null
	initialProjectId: string | null
	selectedSpaceId: string | null
	initialStatus: TaskStatus
	projects: Array<{ id: string; spaceId: string }>
}): TaskCreateFormValues {
	const defaultSpaceId = getDefaultSpaceId(input.spaces)
	const initialProject =
		input.projects.find((project) => project.id === input.initialProjectId) ?? null
	const resolvedInitialSpaceId =
		input.selectedSpaceId ??
		initialProject?.spaceId ??
		getInitialSpaceId(input.currentScope, defaultSpaceId)
	const resolvedInitialPlacement: TaskPlacement = input.initialProjectId
		? 'project'
		: (input.initialPlacement ?? 'inbox')

	return {
		title: '',
		note: '',
		priority: 0,
		spaceId: resolvedInitialSpaceId,
		placement: resolvedInitialPlacement,
		projectId: input.initialProjectId ?? '',
		status: input.initialStatus,
		dueAt: null,
		scheduledAt: null,
		reminderAt: null,
		createMore: false,
	}
}

export function toTaskCreateInput(values: TaskCreateFormValues): CreateTaskInput {
	return {
		spaceId: values.placement === 'project' ? null : values.spaceId,
		placement: buildCreatePlacementInput(values.placement, values.projectId || null),
		title: values.title.trim(),
		note: values.note?.trim() ? values.note.trim() : null,
		status: values.status,
		priority: values.priority,
		dueAt: values.dueAt,
		scheduledAt: values.scheduledAt,
		reminderAt: values.reminderAt,
	}
}

function getDefaultSpaceId(spaces: Space[]) {
	return spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? ''
}

function getInitialSpaceId(currentScope: Scope, fallbackSpaceId: string) {
	return currentScope.type === 'space' ? currentScope.spaceId : fallbackSpaceId
}
