import { useLocation, useNavigate } from '@tanstack/react-router'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithMatchedRoute } from '@/test/renderWithRouter'

import { useTaskDetailNavigationBlocker } from './useTaskDetailNavigationBlocker'

const flushNow = vi.fn<() => Promise<boolean>>()

describe('useTaskDetailNavigationBlocker', () => {
	beforeEach(() => {
		flushNow.mockReset().mockResolvedValue(false)
	})

	it('保存失败时保留当前路由，重试成功后才离开', async () => {
		await renderWithMatchedRoute(<NavigationProbe />, {
			initialEntry: '/work/standalone?task=task-a',
			path: '/$',
		})

		fireEvent.click(screen.getByRole('button', { name: '离开详情' }))
		await waitFor(() => expect(flushNow).toHaveBeenCalledOnce())
		expect(screen.getByTestId('location')).toHaveTextContent('/work/standalone?task=task-a')

		flushNow.mockResolvedValue(true)
		fireEvent.click(screen.getByRole('button', { name: '离开详情' }))
		await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/work/all'))
		expect(flushNow).toHaveBeenCalledTimes(2)
	})
})

function NavigationProbe() {
	const location = useLocation()
	const navigate = useNavigate({ from: '/' })
	useTaskDetailNavigationBlocker({ isDirty: true, flushNow })

	return (
		<>
			<div data-testid='location'>
				{location.pathname}
				{location.searchStr}
			</div>
			<button onClick={() => void navigate({ to: '/work/all' as never })} type='button'>
				离开详情
			</button>
		</>
	)
}
