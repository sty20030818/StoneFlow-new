import { z } from 'zod'

import { nonEmptyTrimmedString } from '@/shared/validation'

export const spaceEditorSchema = z.object({
	name: nonEmptyTrimmedString('请输入 Space 名称'),
	iconKey: z.string().trim().min(1, '请选择图标'),
	colorKey: z.string().trim().min(1, '请选择颜色'),
})

export type SpaceEditorFormValues = z.infer<typeof spaceEditorSchema>

export function buildSpaceEditorDefaultValues(input: {
	name?: string | null
	iconKey?: string | null
	colorKey?: string | null
}): SpaceEditorFormValues {
	return {
		name: input.name ?? '',
		iconKey: input.iconKey ?? 'user',
		colorKey: input.colorKey ?? 'blue',
	}
}
