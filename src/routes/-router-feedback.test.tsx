import { render, screen } from '@testing-library/react'

import { RouterFeedbackPage } from './-router-feedback'

describe('RouterFeedbackPage', () => {
	it('使用空态语义渲染标题、说明和动作', () => {
		render(
			<RouterFeedbackPage
				action={<button type='button'>重试</button>}
				description='请稍后再试。'
				title='应用加载失败'
			/>,
		)

		expect(screen.getByRole('heading', { name: '应用加载失败' })).toBeInTheDocument()
		expect(screen.getByText('请稍后再试。')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
	})
})
