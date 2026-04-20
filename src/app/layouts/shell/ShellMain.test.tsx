import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'

import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { ShellMain } from '@/app/layouts/shell/ShellMain'

describe('ShellMain', () => {
	afterEach(() => {
		useShellLayoutStore.setState({
			currentSpaceId: 'default',
			activeSection: 'inbox',
			isCommandOpen: false,
			isTaskCreateOpen: false,
			isProjectCreateOpen: false,
			isDrawerOpen: false,
			activeDrawerKind: null,
			activeDrawerId: null,
			taskDataVersion: 0,
			projectDataVersion: 0,
		})
	})

	it('在主卡片内部渲染详情遮罩，并允许遮罩点击关闭', async () => {
		useShellLayoutStore.setState({
			isDrawerOpen: true,
			activeDrawerKind: 'project',
			activeDrawerId: 'engineering',
		})

		render(
			<ShellMain
				activeDrawerId='engineering'
				activeDrawerKind='project'
				currentSpaceId='default'
				onCloseDrawer={() => useShellLayoutStore.getState().closeDrawer()}
			>
				<div>workspace content</div>
			</ShellMain>,
		)

		expect(screen.getByText('workspace content')).toBeInTheDocument()
		expect(screen.getByRole('dialog', { name: 'Project detail' })).toBeInTheDocument()
		const overlay = document.querySelector('[data-slot="sheet-overlay"]')
		expect(overlay).not.toBeNull()

		await act(async () => {
			fireEvent.pointerDown(overlay as Element)
		})

		await waitFor(() => {
			expect(useShellLayoutStore.getState()).toMatchObject({
				isDrawerOpen: false,
				activeDrawerKind: null,
				activeDrawerId: null,
			})
		})
	})
})
