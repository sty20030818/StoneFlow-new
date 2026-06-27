import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'

export function normalizeSubmitError(error: unknown, fallback: string): string {
	return normalizeTauriError(error, fallback)
}
