import { getSpaceVisual } from '@/features/space/model/spaceVisuals'
import type { MetadataFieldOption } from '@/features/metadata-fields/core'
import type { Space } from '@/shared/types'

export function createSpaceMetadataOptions(spaces: Space[]): Array<MetadataFieldOption<string>> {
	return spaces.map((space) => {
		const visual = getSpaceVisual(space)
		const SpaceIcon = visual.icon

		return {
			value: space.id,
			label: space.name,
			icon: <SpaceIcon className={`size-3.5 shrink-0 ${visual.iconClassName}`} />,
		}
	})
}

export function getSpaceMetadataButtonVisual(space: Space | null) {
	if (!space) {
		return {
			label: '选择 Space',
			icon: null,
		}
	}

	const visual = getSpaceVisual(space)
	const SpaceIcon = visual.icon

	return {
		label: space.name,
		icon: <SpaceIcon className={`size-3.5 shrink-0 ${visual.iconClassName}`} />,
	}
}
