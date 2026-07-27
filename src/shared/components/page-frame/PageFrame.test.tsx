import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PageFrame } from './PageFrame'

describe('PageFrame', () => {
	it('按 Header、Toolbar、Body、Footer 和 BulkBar 的顺序组合页面', () => {
		render(
			<PageFrame.Root>
				<PageFrame.Header breadcrumb={<span>面包屑</span>} />
				<PageFrame.Toolbar pills={[{ label: '全部任务', active: true }]} />
				<PageFrame.Body>页面主体</PageFrame.Body>
				<PageFrame.Footer>页面尾部</PageFrame.Footer>
				<PageFrame.BulkBar>批量操作</PageFrame.BulkBar>
			</PageFrame.Root>,
		)

		for (const text of ['面包屑', '全部任务', '页面主体', '页面尾部', '批量操作']) {
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
})
