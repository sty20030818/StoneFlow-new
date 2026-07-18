import { describe, expect, it } from 'vitest'

import { resolveActiveChip } from './SystemStatusChip'

describe('resolveActiveChip', () => {
	it('prefers update ready over sync attention', () => {
		expect(resolveActiveChip({ updateReady: true, syncAttention: true })).toBe('update-ready')
	})

	it('shows sync when no update ready', () => {
		expect(resolveActiveChip({ updateReady: false, syncAttention: true })).toBe('sync-attention')
	})

	it('returns null when idle', () => {
		expect(resolveActiveChip({ updateReady: false, syncAttention: false })).toBeNull()
	})
})
