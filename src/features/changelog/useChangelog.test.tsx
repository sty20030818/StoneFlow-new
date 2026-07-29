import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	getChangelog: vi.fn<() => Promise<string | null>>(),
	getUpdateSettings: vi.fn(),
}))

vi.mock('@/features/update/contract', () => ({
	getChangelog: mocks.getChangelog,
	getUpdateSettings: mocks.getUpdateSettings,
}))

async function renderChangelog(refreshKey = false) {
	vi.resetModules()
	const { useChangelog } = await import('./useChangelog')
	return renderHook(({ refresh }) => useChangelog(undefined, refresh), {
		initialProps: { refresh: refreshKey },
	})
}

describe('useChangelog', () => {
	beforeEach(() => {
		mocks.getChangelog.mockReset()
		mocks.getUpdateSettings.mockReset()
		mocks.getUpdateSettings.mockResolvedValue({ channel: 'stable' })
	})

	it('优先使用原生命令读取到的远端内容', async () => {
		mocks.getChangelog.mockResolvedValue(`## [0.4.0] - 2026-07-29\n\n- 远端内容`)
		const { result } = await renderChangelog()

		await waitFor(() => expect(result.current.isLoading).toBe(false))
		expect(result.current.entries.map((entry) => entry.version)).toEqual(['0.4.0'])
	})

	it('远端不可读时回退到打包快照，并在重新打开时刷新渠道', async () => {
		mocks.getChangelog.mockResolvedValue(null)
		const { result, rerender } = await renderChangelog()

		await waitFor(() => expect(result.current.isLoading).toBe(false))
		expect(result.current.entries.map((entry) => entry.version)).toContain('0.1.2')

		mocks.getUpdateSettings.mockResolvedValue({ channel: 'beta' })
		rerender({ refresh: true })
		await waitFor(() => expect(result.current.channel).toBe('beta'))
	})
})
