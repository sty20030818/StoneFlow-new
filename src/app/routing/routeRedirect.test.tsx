import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { normalizeLegacyRoute } from './routeMigration'

describe('routeRedirect', () => {
	it('旧 all shell path 会 replace 到 canonical', async () => {
		renderRedirect('/spaces/views?view=today')

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/all/views?view=today')
		})
	})

	it('旧 scoped shell path 会 replace 到 canonical 并保留 drawer query', async () => {
		renderRedirect('/space/work/inbox?task=task-a')

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/spaces/work/inbox?task=task-a')
		})
	})
})

function renderRedirect(initialEntry: string) {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route element={<LegacyRedirectProbe />} path='/spaces' />
				<Route element={<LegacyRedirectProbe />} path='/spaces/inbox' />
				<Route element={<LegacyRedirectProbe />} path='/spaces/focus' />
				<Route element={<LegacyRedirectProbe />} path='/spaces/all-tasks' />
				<Route element={<LegacyRedirectProbe />} path='/spaces/no-project' />
				<Route element={<LegacyRedirectProbe />} path='/spaces/views' />
				<Route element={<LegacyRedirectProbe />} path='/spaces/projects' />
				<Route element={<LegacyRedirectProbe />} path='/spaces/archive' />
				<Route element={<LegacyRedirectProbe />} path='/spaces/trash' />
				<Route element={<LegacyRedirectProbe />} path='/spaces/settings' />
				<Route element={<LegacyRedirectProbe />} path='/spaces/debug/activity' />
				<Route element={<LegacyRedirectProbe />} path='/space/:spaceId/*' />
				<Route element={<LocationProbe />} path='/all/*' />
				<Route element={<LocationProbe />} path='/spaces/:spaceId/*' />
				<Route element={<LocationProbe />} path='*' />
			</Routes>
		</MemoryRouter>,
	)
}

function LegacyRedirectProbe() {
	const location = useLocation()
	return <Navigate replace to={normalizeLegacyRoute(`${location.pathname}${location.search}`)} />
}

function LocationProbe() {
	const location = useLocation()
	return (
		<div data-testid='location'>
			{location.pathname}
			{location.search}
		</div>
	)
}
