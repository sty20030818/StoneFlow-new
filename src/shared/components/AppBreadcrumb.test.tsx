import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BoxIcon } from 'lucide-react'

import { renderWithRouterContext } from '@/test/renderWithRouter'
import { AppBreadcrumb } from './AppBreadcrumb'

describe('AppBreadcrumb', () => {
	it('只有祖先节点可聚焦，当前节点只保留 aria-current', async () => {
		await renderWithRouterContext(
			<AppBreadcrumb
				items={[
					{
						key: 'projects',
						label: '项目总览',
						to: '/space-1/projects',
						icon: BoxIcon,
					},
					{
						key: 'project',
						label: '项目 A',
						current: true,
						to: '/space-1/project/project-a',
					},
				]}
			/>,
		)

		expect(screen.getByRole('link', { name: '项目总览' })).toHaveAttribute(
			'href',
			'/space-1/projects',
		)
		const current = screen.getByText('项目 A').closest('[aria-current="page"]')
		expect(screen.getAllByRole('link')).toHaveLength(1)
		expect(current).toHaveAttribute('aria-current', 'page')
		expect(current).not.toHaveAttribute('role')
		expect(current).not.toHaveAttribute('tabindex')
	})
})
