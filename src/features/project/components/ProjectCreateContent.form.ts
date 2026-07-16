import { z } from 'zod'

import { optionalTrimmedString, titleString } from '@/shared/validation'

export const projectCreateSchema = z.object({
	name: titleString('项目名称'),
	description: optionalTrimmedString,
	createMore: z.boolean(),
})

export type ProjectCreateFormValues = z.infer<typeof projectCreateSchema>

export function buildProjectCreateDefaultValues(): ProjectCreateFormValues {
	return {
		name: '',
		description: '',
		createMore: false,
	}
}

export function toProjectCreateInput(values: ProjectCreateFormValues, selectedSpaceId: string) {
	return {
		spaceId: selectedSpaceId,
		name: values.name.trim(),
		description: values.description?.trim() ? values.description.trim() : null,
		dueAt: null,
	}
}
