/** @vitest-environment jsdom */

import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BoxIcon } from 'lucide-react'

import { renderWithRouterContext } from '@/test/renderWithRouter'
import { AppBreadcrumb, type BreadcrumbNode } from './AppBreadcrumb'

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
		expect(screen.getByText('项目 A')).toHaveAttribute('aria-current', 'page')
	})

	it('长文本节点保持可渲染', async () => {
		const items: BreadcrumbNode[] = [
			{
				key: 'views',
				label: '视图',
				to: '/all/views',
				icon: BoxIcon,
			},
			{
				key: 'view',
				label: '这是一个非常非常长但应该正常显示的视图名称',
				current: true,
				truncate: true,
			},
		]

		await renderWithRouterContext(<AppBreadcrumb items={items} />)

		expect(screen.getByText('这是一个非常非常长但应该正常显示的视图名称')).toBeInTheDocument()
	})
})
