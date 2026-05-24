import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { useScopeRoute } from './scopeRoute'

describe('useScopeRoute', () => {
	it('从 canonical all shell route 返回 all scope', () => {
		renderScopeProbe('/all/inbox')

		expect(screen.getByTestId('scope')).toHaveTextContent('all')
		expect(screen.getByTestId('space-id')).toHaveTextContent('none')
	})

	it('从 canonical space shell route 返回 space scope', () => {
		renderScopeProbe('/spaces/space-a/inbox')

		expect(screen.getByTestId('scope')).toHaveTextContent('space:space-a')
		expect(screen.getByTestId('space-id')).toHaveTextContent('space-a')
	})

	it('从 legacy space shell route 返回 space scope', () => {
		renderScopeProbe('/space/space-a/inbox')

		expect(screen.getByTestId('scope')).toHaveTextContent('space:space-a')
		expect(screen.getByTestId('space-id')).toHaveTextContent('space-a')
	})
})

function renderScopeProbe(initialEntry: string) {
	return render(
		<MemoryRouter initialEntries={[initialEntry]}>
			<Routes>
				<Route element={<ScopeProbe />} path='*' />
			</Routes>
		</MemoryRouter>,
	)
}

function ScopeProbe() {
	const { scope, spaceId } = useScopeRoute()

	return (
		<div>
			<div data-testid='scope'>
				{scope.type === 'space' ? `space:${scope.spaceId}` : 'all'}
			</div>
			<div data-testid='space-id'>{spaceId ?? 'none'}</div>
		</div>
	)
}
