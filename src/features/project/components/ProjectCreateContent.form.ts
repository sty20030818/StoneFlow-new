import { z } from 'zod'

import { optionalTrimmedString, titleString } from '@/shared/validation'

export const projectCreateSchema = z.object({
	spaceId: z.string().trim().min(1, '当前没有可用 Space，无法创建项目。'),
	name: titleString('项目名称'),
	description: optionalTrimmedString,
	createMore: z.boolean(),
})

export type ProjectCreateFormValues = z.infer<typeof projectCreateSchema>

export function buildProjectCreateDefaultValues(spaceId: string | null): ProjectCreateFormValues {
	return {
		spaceId: spaceId ?? '',
		name: '',
		description: '',
		createMore: false,
	}
}

export function toProjectCreateInput(values: ProjectCreateFormValues) {
	return {
		spaceId: values.spaceId,
		name: values.name.trim(),
		description: values.description?.trim() ? values.description.trim() : null,
		dueAt: null,
	}
}
