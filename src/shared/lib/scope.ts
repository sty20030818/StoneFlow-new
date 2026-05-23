import type { Scope } from '@/shared/types'

export function isScopeMatch(left: Scope | null | undefined, right: Scope): boolean {
	if (!left || left.type !== right.type) {
		return false
	}

	if (left.type === 'all') {
		return true
	}

	if (left.type === 'space' && right.type === 'space') {
		return left.spaceId === right.spaceId
	}

	return false
}
