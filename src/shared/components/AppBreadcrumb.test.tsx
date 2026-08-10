/** @vitest-environment jsdom */

import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BoxIcon } from 'lucide-react'

import { TooltipProvider } from '@/shared/components/base/tooltip'
import { renderWithRouterContext } from '@/test/renderWithRouter'
import { AppBreadcrumb, type BreadcrumbNode } from './AppBreadcrumb'

describe('AppBreadcrumb', () => {
	it('可点击节点渲染为 link，当前节点带 aria-current', async () => {
		await renderWithRouterContext(
			<TooltipProvider delayDuration={0}>
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
				/>
			</TooltipProvider>,
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

		await renderWithRouterContext(
			<TooltipProvider delayDuration={0}>
				<AppBreadcrumb items={items} />
			</TooltipProvider>,
		)

		expect(screen.getByText('这是一个非常非常长但应该正常显示的视图名称')).toBeInTheDocument()
		const overflowTrigger = document.querySelector(
			'[data-slot="overflow-tooltip-trigger"]',
		) as HTMLElement
		Object.defineProperty(overflowTrigger, 'clientWidth', { configurable: true, value: 80 })
		Object.defineProperty(overflowTrigger, 'scrollWidth', { configurable: true, value: 200 })
		fireEvent.focus(overflowTrigger)
		expect(await screen.findByRole('tooltip')).toHaveTextContent(
			'这是一个非常非常长但应该正常显示的视图名称',
		)
	})
})
