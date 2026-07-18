import { fireEvent, screen } from '@testing-library/react'

import { SettingsSidebar } from './SettingsSidebar'
import { SidebarProvider } from '@/shared/components/base/sidebar'
import { TooltipProvider } from '@/shared/components/base/tooltip'
import { renderWithRouterContext } from '@/test/renderWithRouter'
import { useLocation } from '@tanstack/react-router'

describe('SettingsSidebar', () => {
	it('渲染返回应用与设置分区，并高亮当前分区', () => {
		renderSettingsSidebar('sync')

		expect(screen.getByRole('button', { name: '返回应用' })).toBeInTheDocument()
		expect(screen.queryByText('设置')).not.toBeInTheDocument()
		expect(screen.getByText('偏好')).toBeInTheDocument()
		expect(screen.getByText('数据')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '通用' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '侧边栏' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '云同步' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument()

		const syncButton = screen.getByRole('button', { name: '云同步' })
		expect(syncButton).toHaveAttribute('data-active', 'true')
	})

	it('点击返回应用导航到 returnPath', async () => {
		renderSettingsSidebar('general', '/space-personal/inbox')

		fireEvent.click(screen.getByRole('button', { name: '返回应用' }))

		expect(await screen.findByTestId('location')).toHaveTextContent('/space-personal/inbox')
	})

	it('点击分区以 replace 切换 URL', async () => {
		renderSettingsSidebar('general')

		fireEvent.click(screen.getByRole('button', { name: '更新' }))

		expect(await screen.findByTestId('location')).toHaveTextContent('/all/settings/update')
	})
})

function renderSettingsSidebar(
	activeSettingsSection: 'general' | 'sidebar' | 'sync' | 'update',
	returnPath = '/all/tasks',
) {
	return renderWithRouterContext(
		<TooltipProvider>
			<SidebarProvider desktopPreference='expanded' sidebarWidth={256}>
				<LocationProbe />
				<SettingsSidebar
					activeSettingsSection={activeSettingsSection}
					currentScope={{ type: 'all' }}
					currentSpaceId={null}
					returnPath={returnPath}
				/>
			</SidebarProvider>
		</TooltipProvider>,
		{
			initialEntry: `/all/settings/${activeSettingsSection}`,
		},
	)
}

function LocationProbe() {
	const location = useLocation()
	return <div data-testid='location'>{location.pathname}</div>
}
