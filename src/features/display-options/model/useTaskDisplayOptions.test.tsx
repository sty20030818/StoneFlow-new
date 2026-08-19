import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { type PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useTaskDisplayOptions } from './useTaskDisplayOptions'

describe('useTaskDisplayOptions', () => {
	beforeEach(() => {
		localStorage.clear()
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
		await act(async () => {
			await result.current.actions.setGrouping('priority')
		})

		await waitFor(() => expect(result.current.options.groupBy).toBe('priority'))
		expect(localStorage.getItem('stoneflow.display-options.task:task:all')).not.toBeNull()
	})

	it('resetToDefault 会清空 personal override', async () => {
		const { result } = renderWithQueryClient(() => useTaskDisplayOptions('task:all'))

		await waitFor(() => expect(result.current.status).toBe('ready'))
		await act(async () => {
			await result.current.actions.setGrouping('priority')
		})
		await waitFor(() => expect(result.current.options.groupBy).toBe('priority'))

		await act(async () => {
			await result.current.actions.resetToDefault()
		})
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
