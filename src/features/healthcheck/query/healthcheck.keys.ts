export const healthcheckKeys = {
	all: ['healthcheck'] as const,
	status: () => [...healthcheckKeys.all, 'status'] as const,
}
