import type { MetadataPlacementOption, MetadataPlacementValue } from './metadata-field.types'

export function isMetadataPlacementValueEqual(
	left: MetadataPlacementValue,
	right: MetadataPlacementValue,
) {
	if (left.kind !== right.kind) {
		return false
	}

	if (left.kind === 'project' && right.kind === 'project') {
		return left.projectId === right.projectId
	}

	if (left.kind === 'space' && right.kind === 'space') {
		return left.spaceId === right.spaceId
	}

	return true
}

export function getMetadataPlacementKey(value: MetadataPlacementValue) {
	switch (value.kind) {
		case 'project':
			return `project:${value.projectId}`
		case 'space':
			return `space:${value.spaceId}`
		default:
			return value.kind
	}
}

export function findMetadataPlacementOption(
	options: MetadataPlacementOption[],
	value: MetadataPlacementValue,
) {
	return options.find((option) => isMetadataPlacementValueEqual(option.value, value)) ?? options[0]
}
