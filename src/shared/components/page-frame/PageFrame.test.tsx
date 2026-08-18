import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageFrame } from './PageFrame'

describe('PageFrame', () => {
	it('按 Header、Toolbar 和 Body 的顺序组合页面', () => {
		render(
			<PageFrame.Root>
				<PageFrame.Header breadcrumb={<span>面包屑</span>} />
				<PageFrame.Toolbar pills={[{ label: '全部任务', active: true }]} />
				<PageFrame.Body>页面主体</PageFrame.Body>
			</PageFrame.Root>,
		)

		for (const text of ['面包屑', '全部任务', '页面主体']) {
			expect(screen.getByText(text)).toBeInTheDocument()
		}
	})

	it('没有内容时不渲染 Toolbar', () => {
		render(
			<PageFrame.Root>
				<PageFrame.Header breadcrumb={<span>面包屑</span>} />
				<PageFrame.Toolbar />
				<PageFrame.Body>页面主体</PageFrame.Body>
			</PageFrame.Root>,
		)

		expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
	})

	it('虚拟列表主体只提供一个真实滚动 viewport', () => {
		const { container } = render(
			<PageFrame.Root>
				<PageFrame.VirtualizedBody>虚拟列表</PageFrame.VirtualizedBody>
			</PageFrame.Root>,
		)

		const viewports = container.querySelectorAll('[data-scroll-container="true"]')
		expect(viewports).toHaveLength(1)
		expect(viewports[0]).toHaveAttribute('data-scroll-container-role', 'task-board')
		expect(screen.getByText('虚拟列表')).toBeInTheDocument()
	})
})
