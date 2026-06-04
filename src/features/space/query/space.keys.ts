export const spaceKeys = {
	all: ['spaces'] as const,
	visible: () => [...spaceKeys.all, 'visible'] as const,
}
