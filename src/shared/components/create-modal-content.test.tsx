import { render, screen } from '@testing-library/react'

import { CreateModalContent } from './create-modal-content'

describe('CreateModalContent', () => {
	it('描述独占滚动区域，标题、属性和操作位于区域之外', () => {
		render(
			<CreateModalContent>
				<CreateModalContent.Title>
					<div>title</div>
				</CreateModalContent.Title>
				<CreateModalContent.Body>
					<div>body content</div>
				</CreateModalContent.Body>
				<CreateModalContent.Metadata>
					<div>meta</div>
				</CreateModalContent.Metadata>
				<CreateModalContent.Footer>
					<div>footer</div>
				</CreateModalContent.Footer>
			</CreateModalContent>,
		)

		const viewport = screen.getByText('body content').closest('[data-slot="scroll-shadow"]')

		expect(viewport).toHaveAttribute('data-slot', 'scroll-shadow')
		expect(viewport).toHaveAttribute('data-create-description-viewport')
		for (const label of ['title', 'meta', 'footer']) {
			expect(viewport).not.toContainElement(screen.getByText(label))
		}
	})

	it('底栏提供禁用的素材占位按钮，并保留反馈与提交', () => {
		render(
			<CreateModalContent.Footer>
				<CreateModalContent.Feedback>已创建 1 条任务</CreateModalContent.Feedback>
				<button type='submit'>创建任务</button>
			</CreateModalContent.Footer>,
		)

		const materialButton = screen.getByRole('button', { name: '素材（暂未开放）' })
		expect(materialButton).toBeDisabled()
		expect(materialButton).toHaveAttribute('type', 'button')
		expect(screen.getByText('已创建 1 条任务')).toHaveAttribute('aria-live', 'polite')
		expect(screen.getByRole('button', { name: '创建任务' })).toBeEnabled()
		expect(screen.getByRole('button', { name: '创建任务' })).toHaveAttribute('type', 'submit')
	})

	it('统一底部反馈播报失败，重试后恢复成功计数', () => {
		const { rerender } = render(
			<CreateModalContent.Feedback error='暂时无法保存'>
				已创建 1 条任务
			</CreateModalContent.Feedback>,
		)
		expect(screen.getByRole('alert')).toHaveTextContent('暂时无法保存')
		expect(screen.queryByText('已创建 1 条任务')).not.toBeInTheDocument()
		rerender(<CreateModalContent.Feedback>已创建 1 条任务</CreateModalContent.Feedback>)
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		expect(screen.getByText('已创建 1 条任务')).toHaveAttribute('aria-live', 'polite')
	})
})
