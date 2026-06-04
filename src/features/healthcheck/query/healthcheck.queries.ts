import { useQuery } from '@tanstack/react-query'

import { fetchHealthcheck } from '@/features/healthcheck/api/healthcheck'

import { healthcheckKeys } from './healthcheck.keys'

export function useHealthcheckQuery(enabled: boolean) {
	return useQuery({
		queryKey: healthcheckKeys.status(),
		queryFn: fetchHealthcheck,
		enabled,
		staleTime: 60 * 1000,
	})
}
