import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	getChangelog: vi.fn<() => Promise<string | null>>(),
}))

vi.mock('./api', () => ({ getChangelog: mocks.getChangelog }))

function release(version: string, options: { yanked?: boolean; text?: string } = {}) {
	return `## [${version}] - 2026-08-07${options.yanked ? ' [已撤回]' : ''}\n\n### 新增\n\n- ${options.text ?? version}`
}

function changelog(...releases: string[]) {
	return `# StoneFlow 更新日志\n\n## [未发布]\n\n${releases.join('\n\n')}`
}

async function loadHook() {
	vi.resetModules()
	return import('./useChangelog')
}

describe('useChangelog', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
		mocks.getChangelog.mockReset()
	})

	it('query 为空时不请求，完整历史保留已撤回版本', async () => {
		mocks.getChangelog.mockResolvedValue(
			changelog(release('1.1.0', { yanked: true }), release('1.0.0')),
		)
		const { useChangelog } = await loadHook()
		type Query = Parameters<typeof useChangelog>[0]
		const { result, rerender } = renderHook(({ query }: { query: Query }) => useChangelog(query), {
			initialProps: { query: null } as { query: Query },
		})

		expect(mocks.getChangelog).not.toHaveBeenCalled()
		rerender({ query: { kind: 'history', channel: 'stable' } })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		expect(result.current.releases.map((item) => item.version)).toEqual(['1.1.0', '1.0.0'])
		expect(result.current.releases[0].yanked).toBe(true)
	})

	it('打包快照不会冒充远端缓存，关闭后重开会重新请求', async () => {
		mocks.getChangelog
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(changelog(release('9.0.0', { text: '网络恢复' })))
		const { useChangelog } = await loadHook()
		type Query = Parameters<typeof useChangelog>[0]
		const history = { kind: 'history', channel: 'stable' } as const
		const { result, rerender } = renderHook(({ query }: { query: Query }) => useChangelog(query), {
			initialProps: { query: history } as { query: Query },
		})

		await waitFor(() => expect(result.current.isLoading).toBe(false))
		expect(result.current.releases.length).toBeGreaterThan(0)
		expect(result.current.releases.some((item) => item.version === '9.0.0')).toBe(false)

		rerender({ query: null })
		rerender({ query: history })
		await waitFor(() => expect(mocks.getChangelog).toHaveBeenCalledTimes(2))
		await waitFor(() => expect(result.current.releases[0]?.version).toBe('9.0.0'))
	})

	it('远端无效时回退到上次有效远端', async () => {
		let resolveInvalid!: (value: string | null) => void
		mocks.getChangelog
			.mockResolvedValueOnce(changelog(release('2.0.0', { text: '上次有效内容' })))
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveInvalid = resolve
					}),
			)
		const { useChangelog } = await loadHook()
		type Query = Parameters<typeof useChangelog>[0]
		const history = { kind: 'history', channel: 'stable' } as const
		const { result, rerender } = renderHook(({ query }: { query: Query }) => useChangelog(query), {
			initialProps: { query: history } as { query: Query },
		})

		await waitFor(() => expect(result.current.releases[0]?.version).toBe('2.0.0'))
		rerender({ query: null })
		rerender({ query: history })
		await waitFor(() => expect(mocks.getChangelog).toHaveBeenCalledTimes(2))
		expect(result.current.isLoading).toBe(true)
		await act(async () => resolveInvalid('不是合法 changelog'))
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		expect(result.current.releases[0]?.version).toBe('2.0.0')
	})

	it('目标版本改变时刷新并重新选择开闭区间', async () => {
		const remote = changelog(release('1.2.0'), release('1.1.0'), release('1.0.0'))
		mocks.getChangelog.mockResolvedValue(remote)
		const { useChangelog } = await loadHook()
		type Query = Parameters<typeof useChangelog>[0]
		const { result, rerender } = renderHook(({ query }: { query: Query }) => useChangelog(query), {
			initialProps: {
				query: {
					kind: 'range',
					channel: 'stable',
					currentVersion: '1.0.0',
					targetVersion: '1.1.0',
				},
			},
		})

		await waitFor(() => expect(result.current.isLoading).toBe(false))
		expect(result.current.releases.map((item) => item.version)).toEqual(['1.1.0'])
		rerender({
			query: {
				kind: 'range',
				channel: 'stable',
				currentVersion: '1.0.0',
				targetVersion: '1.2.0',
			},
		})
		await waitFor(() => expect(mocks.getChangelog).toHaveBeenCalledTimes(2))
		expect(result.current.releases.map((item) => item.version)).toEqual(['1.2.0', '1.1.0'])
	})

	it('并发消费者共享一个 in-flight 请求', async () => {
		let resolveRemote!: (value: string | null) => void
		mocks.getChangelog.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveRemote = resolve
				}),
		)
		const { useChangelog } = await loadHook()
		const query = { kind: 'history', channel: 'stable' } as const
		const { result } = renderHook(() => [useChangelog(query), useChangelog(query)] as const)

		await waitFor(() => expect(mocks.getChangelog).toHaveBeenCalledTimes(1))
		await act(async () => resolveRemote(changelog(release('3.0.0'))))
		await waitFor(() => expect(result.current.every((item) => !item.isLoading)).toBe(true))
		expect(result.current[0].releases[0]?.version).toBe('3.0.0')
		expect(result.current[1].releases[0]?.version).toBe('3.0.0')
	})
})
