export function normalizeTauriError(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message
	}

	if (typeof error === 'string' && error.trim()) {
		return error
	}

	if (error && typeof error === 'object') {
		if ('message' in error) {
			const message = (error as { message?: unknown }).message
			if (typeof message === 'string' && message.trim()) {
				return message
			}
		}

		if ('type' in error && 'message' in error) {
			const type = (error as { type?: unknown }).type
			const message = (error as { message?: unknown }).message
			if (typeof type === 'string' && typeof message === 'string' && message.trim()) {
				return `${type}: ${message}`
			}
		}
	}

	return fallback
}
