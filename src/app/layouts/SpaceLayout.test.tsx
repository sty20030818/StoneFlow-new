import type { ReactNode } from 'react'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { SpaceLayout } from '@/app/layouts/SpaceLayout'
import { setActiveSpace } from '@/features/task/api/setActiveSpace'

vi.mock('./shell/ShellLayout', () => ({
	ShellLayout: ({
		children,
		currentSpaceId,
		activeSection,
	}: {
		children: ReactNode
		currentSpaceId: string
		activeSection: string
	}) => (
		<div data-active-section={activeSection} data-current-space-id={currentSpaceId}>
			{children}
		</div>
	),
}))

vi.mock('@/features/task/api/setActiveSpace', () => ({
	setActiveSpace: vi.fn<typeof setActiveSpace>(),
}))

const mockedSetActiveSpace = vi.mocked(setActiveSpace)

describe('SpaceLayout', () => {
	afterEach(() => {
		vi.clearAllMocks()
		useShellLayoutStore.setState({
			currentSpaceId: 'default',
			activeSection: 'inbox',
			isCommandOpen: false,
			isTaskCreateOpen: false,
			isProjectCreateOpen: false,
			projectCreateParentId: null,
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
			taskDataVersion: 0,
			projectDataVersion: 0,
		})
	})

	it('进入 Space 路由时同步当前 Space 运行时状态', async () => {
		mockedSetActiveSpace.mockResolvedValue({
			activeSpaceId: 'space-research',
			spaceSlug: 'research',
		})

		render(
			<MemoryRouter initialEntries={['/space/research/inbox']}>
				<Routes>
					<Route element={<SpaceLayout />} path='/space/:spaceId'>
						<Route element={<div>Inbox</div>} path='inbox' />
					</Route>
				</Routes>
			</MemoryRouter>,
		)

		await waitFor(() => {
			expect(mockedSetActiveSpace).toHaveBeenCalledWith('research')
		})

		expect(useShellLayoutStore.getState()).toMatchObject({
			currentSpaceId: 'research',
			activeSection: 'inbox',
		})
	})
})
