import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'

export type QueryLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export function resolveQueryLoadStatus(input: {
	isError: boolean
	isLoading: boolean
	isPending: boolean
}): QueryLoadStatus {
	if (input.isError) {
		return 'error'
	}

	if (input.isLoading || input.isPending) {
		return 'loading'
	}

	return 'ready'
}

export function resolveQueryErrorMessage(error: unknown, fallback: string) {
	return normalizeTauriError(error, fallback)
}
