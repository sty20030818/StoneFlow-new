import { render, screen } from '@testing-library/react'

import { ShellLayoutSkeleton } from './ShellLayoutSkeleton'

describe('ShellLayoutSkeleton', () => {
	it('expanded 骨架由实际 Sidebar 盒宽驱动 auto grid，且匹配桌面 Inset', () => {
		const bootShell = document.createElement('div')
		bootShell.id = 'sf-boot-shell'
		document.body.append(bootShell)

		const { container } = render(
			<ShellLayoutSkeleton desktopPreference='expanded' sidebarWidth={330} status='loading' />,
		)

		const root = container.querySelector('[data-slot="shell-layout-skeleton"]')
		const sidebar = container.querySelector('[data-slot="shell-layout-skeleton-sidebar"]')

		expect(document.getElementById('sf-boot-shell')).not.toBeInTheDocument()
		expect(root).toHaveAttribute('aria-busy', 'true')
		expect(sidebar).toHaveStyle({ '--sidebar-width': '330px' })
	})

	it('collapsed 骨架使用 48px icon rail，并暴露 error 状态文案', () => {
		const { container } = render(
			<ShellLayoutSkeleton
				desktopPreference='collapsed'
				message='空间加载失败'
				sidebarWidth={300}
				status='error'
			/>,
		)

		const sidebar = container.querySelector('[data-slot="shell-layout-skeleton-sidebar"]')
		expect(sidebar).toHaveStyle({ '--sidebar-width': '48px' })
		expect(screen.getByLabelText('空间加载失败')).toHaveAttribute('aria-busy', 'true')
	})
})
