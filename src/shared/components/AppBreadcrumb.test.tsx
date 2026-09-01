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

	it('长中间祖先占用剩余宽度，当前节点保留完整右侧边界', async () => {
		await renderWithRouterContext(
			<AppBreadcrumb
				items={[
					{ key: 'workspace', label: '工作区', to: '/space-1' },
					{
						key: 'project',
						label: '这是一个用于验证中间祖先截断的长中文项目名称',
						to: '/space-1/projects/project-a',
					},
					{
						key: 'task',
						label: '这是一个同样需要在窄宽里保留右侧边界的长中文当前任务',
						current: true,
					},
				]}
			/>,
		)

		const middleItem = screen.getByRole('link', { name: /用于验证中间祖先截断/ }).parentElement
		const currentItem = screen
			.getByText(/同样需要在窄宽里保留右侧边界/)
			.closest('.breadcrumbs__item')

		expect(middleItem).toHaveClass('min-w-0', 'flex-1')
		expect(currentItem).not.toHaveClass('flex-1')
		expect(currentItem).toHaveClass('!shrink')
		expect(screen.getByLabelText('当前位置')).toHaveClass('max-w-full')
		expect(screen.getByLabelText('当前位置')).not.toHaveClass('overflow-hidden')
	})
})
