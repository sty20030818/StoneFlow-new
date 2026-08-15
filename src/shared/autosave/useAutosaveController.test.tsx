import { act, renderHook } from '@testing-library/react'

import { useAutosaveController } from './useAutosaveController'

type Draft = {
	title: string
	note: string | null
}

type Patch = Partial<Draft>

function getPatch(base: Draft, draft: Draft): Patch | null {
	const patch: Patch = {}
	if (base.title !== draft.title) {
		patch.title = draft.title
	}
	if (base.note !== draft.note) {
		patch.note = draft.note
	}
	return Object.keys(patch).length > 0 ? patch : null
}

async function flushPromises() {
	await Promise.resolve()
	await Promise.resolve()
}

describe('useAutosaveController', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
	})

	it('debounced 字段在默认 600ms 后保存', async () => {
		const savePatch = vi.fn(async (patch: Patch): Promise<Draft> => ({
			title: patch.title ?? 'old',
			note: patch.note ?? null,
		}))
		const { result } = renderHook(() =>
			useAutosaveController({
				base: { title: 'old', note: null },
				getPatch,
				savePatch,
			}),
		)

		act(() => {
			result.current.setField('title', 'new')
		})

		expect(result.current.status).toBe('scheduled')
		expect(savePatch).not.toHaveBeenCalled()

		await act(async () => {
			vi.advanceTimersByTime(600)
			await flushPromises()
		})

		expect(savePatch).toHaveBeenCalledWith({ title: 'new' })
		expect(result.current.status).toBe('saved')
	})

	it('immediate 字段不等待 debounce', async () => {
		const savePatch = vi.fn(async (patch: Patch): Promise<Draft> => ({
			title: patch.title ?? 'old',
			note: patch.note ?? null,
		}))
		const { result } = renderHook(() =>
			useAutosaveController({
				base: { title: 'old', note: null },
				getPatch,
				savePatch,
			}),
		)

		await act(async () => {
			result.current.setField('title', 'new', { saveMode: 'immediate' })
			await flushPromises()
		})

		expect(savePatch).toHaveBeenCalledWith({ title: 'new' })
		expect(result.current.status).toBe('saved')
	})

	it('manual 字段只变 dirty，flushNow 后才保存', async () => {
		const savePatch = vi.fn(async (patch: Patch): Promise<Draft> => ({
			title: patch.title ?? 'old',
			note: patch.note ?? null,
		}))
		const { result } = renderHook(() =>
			useAutosaveController({
				base: { title: 'old', note: null },
				getPatch,
				savePatch,
			}),
		)

		act(() => {
			result.current.setField('title', 'manual', { saveMode: 'manual' })
			vi.advanceTimersByTime(1000)
		})

		expect(result.current.status).toBe('dirty')
		expect(savePatch).not.toHaveBeenCalled()

		await act(async () => {
			await result.current.flushNow()
		})

		expect(savePatch).toHaveBeenCalledWith({ title: 'manual' })
		expect(result.current.status).toBe('saved')
	})

	it('flushNow 会取消 pending debounce', async () => {
		const savePatch = vi.fn(async (patch: Patch): Promise<Draft> => ({
			title: patch.title ?? 'old',
			note: patch.note ?? null,
		}))
		const { result } = renderHook(() =>
			useAutosaveController({
				base: { title: 'old', note: null },
				getPatch,
				savePatch,
			}),
		)

		await act(async () => {
			result.current.setField('title', 'flushed')
			await result.current.flushNow()
			vi.advanceTimersByTime(600)
			await flushPromises()
		})

		expect(savePatch).toHaveBeenCalledTimes(1)
		expect(savePatch).toHaveBeenCalledWith({ title: 'flushed' })
	})

	it('flushNow 返回保存结果，失败时保留 dirty draft', async () => {
		const savePatch = vi
			.fn<(patch: Patch) => Promise<Draft>>()
			.mockRejectedValue(new Error('network'))
		const { result } = renderHook(() =>
			useAutosaveController({
				base: { title: 'old', note: null },
				getPatch,
				savePatch,
			}),
		)

		act(() => {
			result.current.setField('title', 'new', { saveMode: 'manual' })
		})

		let saved = true
		await act(async () => {
			saved = await result.current.flushNow()
		})

		expect(saved).toBe(false)
		expect(result.current.status).toBe('failed')
		expect(result.current.isDirty).toBe(true)
		expect(result.current.draft.title).toBe('new')
	})

	it('干净 draft flushNow 后保持 idle', async () => {
		const savePatch = vi.fn<(patch: Patch) => Promise<Draft>>()
		const { result } = renderHook(() =>
			useAutosaveController({
				base: { title: 'old', note: null },
				getPatch,
				savePatch,
			}),
		)

		await act(async () => {
			expect(await result.current.flushNow()).toBe(true)
		})

		expect(savePatch).not.toHaveBeenCalled()
		expect(result.current.status).toBe('idle')
	})

	it('flushNow 会等待保存中的后续 patch 一并落盘', async () => {
		let resolveFirstSave: ((value: Draft) => void) | null = null
		const savePatch = vi
			.fn<(patch: Patch) => Promise<Draft>>()
			.mockImplementationOnce(
				(patch) =>
					new Promise<Draft>((resolve) => {
						resolveFirstSave = () =>
							resolve({
								title: patch.title ?? 'old',
								note: patch.note ?? null,
							})
					}),
			)
			.mockImplementationOnce(async (patch) => ({
				title: patch.title ?? 'first',
				note: patch.note ?? null,
			}))
		const { result } = renderHook(() =>
			useAutosaveController({
				base: { title: 'old', note: null },
				getPatch,
				savePatch,
			}),
		)

		act(() => {
			result.current.setField('title', 'first', { saveMode: 'immediate' })
			result.current.setField('note', 'second')
		})

		let flushPromise: Promise<boolean> | null = null
		act(() => {
			flushPromise = result.current.flushNow()
		})
		await act(async () => {
			resolveFirstSave?.({ title: 'first', note: null })
			expect(await flushPromise).toBe(true)
		})

		expect(savePatch).toHaveBeenCalledTimes(2)
		expect(savePatch).toHaveBeenNthCalledWith(2, { note: 'second' })
		expect(result.current.isDirty).toBe(false)
	})

	it('savePatch 返回的新 base 会成为后续 diff 基准', async () => {
		const savePatch = vi.fn(async (patch: Patch): Promise<Draft> => ({
			title: patch.title ?? 'old',
			note: patch.note ?? null,
		}))
		const { result } = renderHook(() =>
			useAutosaveController({
				base: { title: 'old', note: null },
				getPatch,
				savePatch,
			}),
		)

		await act(async () => {
			result.current.setField('title', 'new', { saveMode: 'immediate' })
			await flushPromises()
		})
		await act(async () => {
			result.current.setField('note', 'note', { saveMode: 'immediate' })
			await flushPromises()
		})

		expect(savePatch).toHaveBeenNthCalledWith(1, { title: 'new' })
		expect(savePatch).toHaveBeenNthCalledWith(2, { note: 'note' })
	})

	it('保存失败保留 draft，retry 可重新提交', async () => {
		const savePatch = vi
			.fn<(patch: Patch) => Promise<Draft>>()
			.mockRejectedValueOnce(new Error('network'))
			.mockImplementationOnce(async (patch) => ({
				title: patch.title ?? 'old',
				note: patch.note ?? null,
			}))
		const { result } = renderHook(() =>
			useAutosaveController({
				base: { title: 'old', note: null },
				getPatch,
				savePatch,
			}),
		)

		await act(async () => {
			result.current.setField('title', 'new', { saveMode: 'immediate' })
			await flushPromises()
		})

		expect(result.current.status).toBe('failed')
		expect(result.current.error).toBe('network')
		expect(result.current.draft.title).toBe('new')

		await act(async () => {
			await result.current.retry()
		})

		expect(savePatch).toHaveBeenCalledTimes(2)
		expect(result.current.status).toBe('saved')
	})

	it('reset 会清理 timer 和错误状态', async () => {
		const savePatch = vi.fn(async (patch: Patch): Promise<Draft> => ({
			title: patch.title ?? 'old',
			note: patch.note ?? null,
		}))
		const { result } = renderHook(() =>
			useAutosaveController({
				base: { title: 'old', note: null },
				getPatch,
				savePatch,
			}),
		)

		act(() => {
			result.current.setField('title', 'pending')
			result.current.reset({ title: 'remote', note: 'fresh' })
			vi.advanceTimersByTime(600)
		})

		expect(savePatch).not.toHaveBeenCalled()
		expect(result.current.status).toBe('idle')
		expect(result.current.error).toBeNull()
		expect(result.current.draft).toEqual({ title: 'remote', note: 'fresh' })
	})

	it('保存中继续编辑不会丢失第二次 patch', async () => {
		let resolveFirstSave: ((value: Draft) => void) | null = null
		const savePatch = vi
			.fn<(patch: Patch) => Promise<Draft>>()
			.mockImplementationOnce(
				(patch) =>
					new Promise<Draft>((resolve) => {
						resolveFirstSave = () =>
							resolve({
								title: patch.title ?? 'old',
								note: patch.note ?? null,
							})
					}),
			)
			.mockImplementationOnce(async (patch) => ({
				title: patch.title ?? 'first',
				note: patch.note ?? null,
			}))
		const { result } = renderHook(() =>
			useAutosaveController({
				base: { title: 'old', note: null },
				getPatch,
				savePatch,
			}),
		)

		await act(async () => {
			result.current.setField('title', 'first', { saveMode: 'immediate' })
			await flushPromises()
		})
		act(() => {
			result.current.setField('note', 'second')
		})
		await act(async () => {
			resolveFirstSave?.({ title: 'first', note: null })
			await flushPromises()
		})

		expect(result.current.draft).toEqual({ title: 'first', note: 'second' })
		expect(result.current.status).toBe('scheduled')

		await act(async () => {
			vi.advanceTimersByTime(600)
			await flushPromises()
		})

		expect(savePatch).toHaveBeenNthCalledWith(2, { note: 'second' })
		expect(result.current.status).toBe('saved')
	})
})
