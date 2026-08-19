import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BoxIcon } from 'lucide-react'

import { renderWithRouterContext } from '@/test/renderWithRouter'
import { AppBreadcrumb } from './AppBreadcrumb'

describe('AppBreadcrumb', () => {
	it('可点击节点渲染为 link，当前节点带 aria-current', async () => {
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
					},
				]}
			/>,
		)

		expect(screen.getByRole('link', { name: '项目总览' })).toHaveAttribute(
			'href',
			'/space-1/projects',
		)
		expect(screen.getByText('项目 A').closest('[aria-current="page"]')).toHaveAttribute(
			'aria-current',
			'page',
		)
	})
})
