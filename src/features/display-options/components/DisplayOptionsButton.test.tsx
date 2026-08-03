import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DisplayOptionsButton } from './DisplayOptionsButton'

const storeState = vi.hoisted(() => new Map<string, unknown>())

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
			save: vi.fn(() => Promise.resolve()),
		}
	}),
}))

describe('DisplayOptionsButton', () => {
	beforeEach(() => {
		storeState.clear()
	})

	it('点击后会打开 display options 面板', async () => {
		renderWithQueryClient(<DisplayOptionsButton pageKey='task:all' />)

		fireEvent.click(screen.getByRole('button', { name: '显示选项' }))

		expect(await screen.findByText('主分组')).toBeInTheDocument()
		expect(screen.getByLabelText('主分组')).toBeInTheDocument()
	})

	it('切换显示属性会持久化 personal override', async () => {
		renderWithQueryClient(<DisplayOptionsButton pageKey='task:all' />)

		fireEvent.click(screen.getByRole('button', { name: '显示选项' }))
		await waitFor(() => expect(screen.queryByText('正在读取显示偏好…')).not.toBeInTheDocument())
		fireEvent.click(await screen.findByRole('button', { name: /截止时间/ }))

		await waitFor(() => {
			expect(storeState.get('task:task:all')).toEqual(
				expect.objectContaining({
					personal: expect.objectContaining({
						visibleProperties: ['status', 'priority', 'project'],
					}),
				}),
			)
		})
	})

	it('V1 面板不再暴露 links 显示属性', async () => {
		renderWithQueryClient(<DisplayOptionsButton pageKey='task:all' />)

		fireEvent.click(screen.getByRole('button', { name: '显示选项' }))

		await screen.findByText('显示属性')
		expect(screen.queryByRole('button', { name: /链接/ })).not.toBeInTheDocument()
	})
})

function renderWithQueryClient(ui: React.ReactNode) {
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

	return render(
		<QueryClientProvider client={queryClient}>
			<TestWrapper>{ui}</TestWrapper>
		</QueryClientProvider>,
	)
}

function TestWrapper({ children }: PropsWithChildren) {
	return <div className='p-6'>{children}</div>
}
