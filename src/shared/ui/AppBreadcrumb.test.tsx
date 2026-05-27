/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { BoxIcon } from 'lucide-react'

import { AppBreadcrumb, type BreadcrumbNode } from './AppBreadcrumb'

describe('AppBreadcrumb', () => {
	it('可点击节点渲染为 link，当前节点带 aria-current', () => {
		render(
			<MemoryRouter>
				<AppBreadcrumb
					items={[
						{
							key: 'projects',
							label: '项目总览',
							to: '/spaces/space-1/projects',
							icon: BoxIcon,
						},
						{
							key: 'project',
							label: '项目 A',
							current: true,
						},
					]}
				/>
			</MemoryRouter>,
		)

		expect(screen.getByRole('link', { name: '项目总览' })).toHaveAttribute(
			'href',
			'/spaces/space-1/projects',
		)
		expect(screen.getByText('项目 A')).toHaveAttribute('aria-current', 'page')
	})

	it('长文本节点保持可渲染', () => {
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

		render(
			<MemoryRouter>
				<AppBreadcrumb items={items} />
			</MemoryRouter>,
		)

		expect(screen.getByText('这是一个非常非常长但应该正常显示的视图名称')).toBeInTheDocument()
	})
})
