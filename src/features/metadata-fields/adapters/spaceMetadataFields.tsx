import { getSpaceVisual } from '@/features/space'
import {
	createSpaceActionSpec,
	mapMetadataActionSpecToDropdownProps,
	type MetadataDropdownMappedProps,
	type MetadataFieldOption,
} from '@/features/metadata-fields/core'
import type { Space } from '@/shared/types'

export function createSpaceMetadataOptions(spaces: Space[]): Array<MetadataFieldOption<string>> {
	return createSpaceMetadataDropdownProps(spaces).options
}

export function createSpaceMetadataDropdownProps(
	spaces: Space[],
): MetadataDropdownMappedProps<string> {
	const dropdownProps = mapMetadataActionSpecToDropdownProps(
		createSpaceActionSpec({
			spaces,
		}),
	)

	return {
		...dropdownProps,
		options: dropdownProps.options.map((option) => {
			const space = spaces.find((entry) => entry.id === option.value)
			if (!space) {
				return option
			}

			const visual = getSpaceVisual(space)
			const SpaceIcon = visual.icon

			return {
				...option,
				icon: <SpaceIcon className={`size-3.5 shrink-0 ${visual.iconClassName}`} />,
			}
		}),
	}
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
