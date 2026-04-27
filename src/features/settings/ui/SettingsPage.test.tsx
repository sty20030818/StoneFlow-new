import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { SettingsPage } from '@/features/settings/ui/SettingsPage'

describe('SettingsPage', () => {
	it('渲染设置占位页', () => {
		render(
			<MemoryRouter>
				<SettingsPage />
			</MemoryRouter>,
		)

		expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
		expect(screen.getByText('设置功能建设中')).toBeInTheDocument()
		expect(screen.getByRole('link', { name: '返回 Inbox' })).toBeInTheDocument()
	})
})
