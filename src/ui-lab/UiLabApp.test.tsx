import { act, fireEvent, render, screen, within } from '@testing-library/react'

import { UiLabApp } from './UiLabApp'

describe('UiLabApp', () => {
	it('通过同一工作台完成双视图、分类、搜索、单预览与键盘路径', () => {
		render(<UiLabApp />)

		const preview = screen.getByRole('region', { name: '当前样例预览' })
		expect(screen.getByRole('button', { name: 'StoneFlow' })).toHaveAttribute(
			'aria-pressed',
			'true',
		)
		expect(within(preview).getByRole('heading', { name: 'StoneFlow Button' })).toBeInTheDocument()
		fireEvent.click(within(preview).getByRole('button', { name: '新建任务' }))
		expect(within(preview).getByText('已触发 1 次')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: 'Foundations' }))
		expect(screen.getByText('这个分类还没有样例')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
		expect(within(preview).getByRole('heading', { name: 'StoneFlow Button' })).toBeInTheDocument()

		const search = screen.getByRole('searchbox', { name: '搜索样例' })
		fireEvent.change(search, { target: { value: '不存在的组件' } })
		expect(screen.getByText('没有匹配的样例')).toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '清空搜索' }))
		expect(within(preview).getByRole('heading', { name: 'StoneFlow Button' })).toBeInTheDocument()

		const heroUIView = screen.getByRole('button', { name: 'HeroUI' })
		act(() => heroUIView.focus())
		fireEvent.keyDown(heroUIView, { key: 'Enter' })
		fireEvent.keyUp(heroUIView, { key: 'Enter' })
		expect(heroUIView).toHaveFocus()
		expect(heroUIView).toHaveAttribute('aria-pressed', 'true')
		expect(within(preview).getByRole('heading', { name: 'HeroUI Button' })).toBeInTheDocument()
		expect(within(preview).getByRole('button', { name: '验证组件' })).toBeInTheDocument()
		expect(within(preview).queryByRole('button', { name: '新建任务' })).not.toBeInTheDocument()
	})
})
