import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { type PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTaskDisplayOptions } from './useTaskDisplayOptions'

const storeState = vi.hoisted(() => new Map<string, unknown>())
const storeSaveMock = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/plugin-store', () => ({
	LazyStore: vi.fn(function LazyStore() {
		return {
			get: vi.fn((key: string) => Promise.resolve(storeState.get(key))),
			set: vi.fn((key: string, value: unknown) => {
				storeState.set(key, value)
				return Promise.resolve()
			}),
			delete: vi.fn((key: string) => {
				storeState.delete(key)
				return Promise.resolve()
			}),
			save: vi.fn(() => {
				storeSaveMock()
				return Promise.resolve()
			}),
		}
	}),
}))

describe('useTaskDisplayOptions', () => {
	beforeEach(() => {
		storeState.clear()
		storeSaveMock.mockClear()
	})

	it('默认返回系统默认 display options', async () => {
		const { result } = renderWithQueryClient(() => useTaskDisplayOptions('task:all'))

		await waitFor(() => expect(result.current.status).toBe('ready'))

		expect(result.current.options.orderBy).toBe('smart')
		expect(result.current.options.groupBy).toBe('status')
	})

	it('setGrouping 会持久化 personal override 并刷新结果', async () => {
		const { result } = renderWithQueryClient(() => useTaskDisplayOptions('task:all'))

		await waitFor(() => expect(result.current.status).toBe('ready'))
		await result.current.actions.setGrouping('priority')

		await waitFor(() => expect(result.current.options.groupBy).toBe('priority'))
		expect(storeSaveMock).toHaveBeenCalled()
	})

	it('resetToDefault 会清空 personal override', async () => {
		const { result } = renderWithQueryClient(() => useTaskDisplayOptions('task:all'))

		await waitFor(() => expect(result.current.status).toBe('ready'))
		await result.current.actions.setGrouping('priority')
		await waitFor(() => expect(result.current.options.groupBy).toBe('priority'))

		await result.current.actions.resetToDefault()
		await waitFor(() => expect(result.current.options.groupBy).toBe('status'))
	})
})

function renderWithQueryClient<T>(callback: () => T) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
			mutations: {
				retry: false,
			},
		},
	})

	return renderHook(callback, {
		wrapper: ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	})
}
