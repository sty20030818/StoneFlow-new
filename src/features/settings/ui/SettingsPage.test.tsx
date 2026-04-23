import { render, screen } from '@testing-library/react'

import { SettingsPage } from '@/features/settings/ui/SettingsPage'

describe('SettingsPage', () => {
	it('渲染设置占位页', () => {
		render(<SettingsPage />)

		expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
		expect(screen.getByText('设置功能建设中')).toBeInTheDocument()
	})
})
