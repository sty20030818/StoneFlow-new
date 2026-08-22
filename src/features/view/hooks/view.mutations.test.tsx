import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'

import { useCreateViewMutation } from './view.mutations'

const { createViewMock } = vi.hoisted(() => ({ createViewMock: vi.fn() }))

vi.mock('../api/views', () => ({
	createView: createViewMock,
	deleteView: vi.fn(),
	updateView: vi.fn(),
}))

it('保存 View 后只失效 View 查询', async () => {
	createViewMock.mockResolvedValue({ id: 'view-1' })
	const queryClient = new QueryClient()
	const invalidateQueries = vi.fn(async () => undefined)
	queryClient.invalidateQueries = invalidateQueries as typeof queryClient.invalidateQueries
	const { result } = renderHook(() => useCreateViewMutation(), {
		wrapper: ({ children }: PropsWithChildren) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	})

	await act(async () => {
		await result.current.mutateAsync({
			name: '重点事项',
			scope: { type: 'all' },
			context: { kind: 'all' },
			baseViewKey: 'all',
			filters: { clauses: [] },
		})
	})

	expect(invalidateQueries).toHaveBeenCalledOnce()
	expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['views'] })
})
