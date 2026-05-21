/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'

vi.mock('@/shared/ui/OverlayScrollbar', () => ({
	OverlayScrollbar: ({ className }: { className?: string }) => (
		<div aria-hidden='true' className={className} data-testid='overlay-scrollbar' />
	),
}))

import {
	DetailBody,
	DetailDrawerShell,
	DetailFieldRow,
	DetailFooter,
	DetailHeader,
	DetailSection,
} from './index'

describe('详情通用界面基元', () => {
	it('按头部、正文、底部顺序渲染并暴露抽屉壳协议', () => {
		render(
			<DetailDrawerShell aria-label='详情'>
				<DetailHeader>头部</DetailHeader>
				<DetailBody>
					<div>正文</div>
				</DetailBody>
				<DetailFooter>底部</DetailFooter>
			</DetailDrawerShell>,
		)

		const shell = screen.getByLabelText('详情')
		const header = screen.getByText('头部')
		const body = screen.getByText('正文')
		const footer = screen.getByText('底部')

		expect(shell).toHaveAttribute('data-detail-drawer-shell', 'true')
		expect(shell.className).toContain('flex')
		expect(shell.className).toContain('h-full')
		expect(shell.className).toContain('min-h-0')
		expect([...shell.querySelectorAll('div')]).toEqual(
			expect.arrayContaining([header, body, footer]),
		)
	})

	it('正文使用 AppScrollArea，并把滚动协议挂在真实 viewport', () => {
		render(
			<DetailDrawerShell>
				<DetailBody>
					<div>可滚动内容</div>
				</DetailBody>
				<DetailFooter>底部</DetailFooter>
			</DetailDrawerShell>,
		)

		const viewport = screen.getByText('可滚动内容').closest('[data-scroll-container="true"]')
		const wrapper = viewport?.parentElement
		const footer = screen.getByText('底部')

		expect(viewport).toHaveAttribute('data-scroll-container', 'true')
		expect(viewport?.className).toContain('overflow-y-auto')
		expect(viewport?.className).toContain('pb-20')
		expect(wrapper?.className).toContain('min-h-0')
		expect(wrapper?.className).toContain('flex-1')
		expect(footer.className).toContain('shrink-0')
	})

	it('分区和字段行只提供通用布局语义', () => {
		render(
			<DetailSection description='说明' title='属性'>
				<DetailFieldRow description='字段说明' label='状态'>
					<button type='button'>待办</button>
				</DetailFieldRow>
			</DetailSection>,
		)

		expect(screen.getByText('属性')).toBeInTheDocument()
		expect(screen.getByText('说明')).toBeInTheDocument()
		expect(screen.getByText('状态')).toBeInTheDocument()
		expect(screen.getByText('字段说明')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '待办' })).toBeInTheDocument()
	})
})
