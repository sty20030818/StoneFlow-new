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

describe('Detail UI primitive', () => {
	it('按 Header / Body / Footer 顺序渲染并暴露 drawer shell 协议', () => {
		render(
			<DetailDrawerShell aria-label='详情'>
				<DetailHeader>Header</DetailHeader>
				<DetailBody>
					<div>Body</div>
				</DetailBody>
				<DetailFooter>Footer</DetailFooter>
			</DetailDrawerShell>,
		)

		const shell = screen.getByLabelText('详情')
		const header = screen.getByText('Header')
		const body = screen.getByText('Body')
		const footer = screen.getByText('Footer')

		expect(shell).toHaveAttribute('data-detail-drawer-shell', 'true')
		expect(shell.className).toContain('flex')
		expect(shell.className).toContain('h-full')
		expect(shell.className).toContain('min-h-0')
		expect([...shell.querySelectorAll('div')]).toEqual(
			expect.arrayContaining([header, body, footer]),
		)
	})

	it('Body 使用 AppScrollArea，并把滚动协议挂在真实 viewport', () => {
		render(
			<DetailDrawerShell>
				<DetailBody>
					<div>Scrollable content</div>
				</DetailBody>
				<DetailFooter>Footer</DetailFooter>
			</DetailDrawerShell>,
		)

		const viewport = screen.getByText('Scrollable content').closest('[data-scroll-container="true"]')
		const wrapper = viewport?.parentElement
		const footer = screen.getByText('Footer')

		expect(viewport).toHaveAttribute('data-scroll-container', 'true')
		expect(viewport?.className).toContain('overflow-y-auto')
		expect(viewport?.className).toContain('pb-20')
		expect(wrapper?.className).toContain('min-h-0')
		expect(wrapper?.className).toContain('flex-1')
		expect(footer.className).toContain('shrink-0')
	})

	it('Section 与 FieldRow 只提供通用布局语义', () => {
		render(
			<DetailSection description='说明' title='属性'>
				<DetailFieldRow description='字段说明' label='状态'>
					<button type='button'>Todo</button>
				</DetailFieldRow>
			</DetailSection>,
		)

		expect(screen.getByText('属性')).toBeInTheDocument()
		expect(screen.getByText('说明')).toBeInTheDocument()
		expect(screen.getByText('状态')).toBeInTheDocument()
		expect(screen.getByText('字段说明')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Todo' })).toBeInTheDocument()
	})
})
