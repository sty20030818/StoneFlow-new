import { createElement } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUpdateStore } from '../model/useUpdateStore'
import { resolveActiveChip, SystemStatusChip } from './SystemStatusChip'

vi.mock('@/features/sync', () => ({
	formatReplicaState: (value: string) => value,
	formatSyncStatus: (value: string) => value,
	useSharedSyncStatus: () => ({
		displayedStatus: 'idle',
		message: null,
		runNow: vi.fn(),
		running: false,
		statusPayload: null,
	}),
}))

beforeEach(() => {
	useUpdateStore.getState().reset()
})

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

	it('Ready chip 只打开确认 Dialog，不直接暴露安装动作', () => {
		useUpdateStore.getState().applySnapshot({
			revision: 1,
			phase: 'ready',
			update: { version: '0.2.0-beta.4', channel: 'beta' },
			progress: null,
			errorMessage: null,
		})
		render(createElement(SystemStatusChip))

		expect(screen.queryByRole('button', { name: '重启' })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '查看' }))
		expect(useUpdateStore.getState().dialogVisible).toBe(true)
	})
})
