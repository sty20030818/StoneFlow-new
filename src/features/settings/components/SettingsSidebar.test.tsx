import { fireEvent, screen } from '@testing-library/react'
import { Sidebar } from '@heroui-pro/react'

import { SettingsSidebar } from './SettingsSidebar'
import { renderWithRouterContext } from '@/test/renderWithRouter'
import { useLocation } from '@tanstack/react-router'

describe('SettingsSidebar', () => {
	it('渲染返回应用与设置分区，并高亮当前分区', async () => {
		await renderSettingsSidebar('sync')

		expect(screen.getByRole('button', { name: '返回应用' })).toBeInTheDocument()
		expect(screen.queryByText('设置')).not.toBeInTheDocument()
		expect(screen.getByText('偏好')).toBeInTheDocument()
		expect(screen.getByText('数据')).toBeInTheDocument()
		expect(screen.getByRole('row', { name: '通用' })).toBeInTheDocument()
		expect(screen.getByRole('row', { name: '侧边栏' })).toBeInTheDocument()
		expect(screen.getByRole('row', { name: '云同步' })).toBeInTheDocument()
		expect(screen.getByRole('row', { name: '更新' })).toBeInTheDocument()

		const syncButton = screen.getByRole('row', { name: '云同步' })
		expect(syncButton).toHaveAttribute('data-current', 'true')
	})

	it('点击返回应用导航到 returnPath', async () => {
		await renderSettingsSidebar('general', '/space-personal/standalone')

		fireEvent.click(screen.getByRole('button', { name: '返回应用' }))

		expect(await screen.findByTestId('location')).toHaveTextContent('/space-personal/standalone')
	})

	it('点击分区以 replace 切换 URL', async () => {
		await renderSettingsSidebar('general')

		fireEvent.click(screen.getByRole('row', { name: '更新' }))

		expect(await screen.findByTestId('location')).toHaveTextContent('/all/settings/update')
	})
})

function renderSettingsSidebar(
	activeSettingsSection: 'general' | 'sidebar' | 'sync' | 'update',
	returnPath = '/all/tasks',
) {
	return renderWithRouterContext(
		<Sidebar.Provider defaultOpen toggleShortcut={false}>
			<LocationProbe />
			<SettingsSidebar
				activeSettingsSection={activeSettingsSection}
				currentScope={{ type: 'all' }}
				currentSpaceId={null}
				returnPath={returnPath}
			/>
		</Sidebar.Provider>,
		{
			initialEntry: `/all/settings/${activeSettingsSection}`,
		},
	)
}

function LocationProbe() {
	const location = useLocation()
	return <div data-testid='location'>{location.pathname}</div>
}
