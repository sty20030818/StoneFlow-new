import { describe, expect, it } from 'vitest'

import { pickSystemChip } from './SystemStatusChip'

describe('pickSystemChip', () => {
	it('prefers update ready over sync attention', () => {
		expect(pickSystemChip({ updateReady: true, syncAttention: true })).toBe('update-ready')
	})

	it('shows sync when no update ready', () => {
		expect(pickSystemChip({ updateReady: false, syncAttention: true })).toBe('sync-attention')
	})

	it('returns null when idle', () => {
		expect(pickSystemChip({ updateReady: false, syncAttention: false })).toBeNull()
	})
})
