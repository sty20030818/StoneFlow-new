import { render, screen } from '@testing-library/react'

import { ShortcutTokens } from './ShortcutTokens'

describe('ShortcutTokens', () => {
	it('隐藏视觉键帽，并用独立文案表达顺序输入语义', () => {
		render(
			<ShortcutTokens
				tokens={[
					{ type: 'key', value: 'G' },
					{ type: 'separator', value: '→' },
					{ type: 'key', value: 'T' },
				]}
			/>,
		)

		expect(screen.getByLabelText('依次按 G、T')).toBeInTheDocument()
		expect(screen.getByText('G').closest('[aria-hidden="true"]')).toBeInTheDocument()
		expect(screen.getByText('T').closest('[aria-hidden="true"]')).toBeInTheDocument()
	})

	it('不会让读屏直接朗读 macOS 修饰键符号', () => {
		render(
			<ShortcutTokens
				tokens={[
					{ type: 'key', value: '⇧' },
					{ type: 'key', value: '⌘' },
					{ type: 'key', value: 'Enter' },
				]}
			/>,
		)

		expect(screen.getByLabelText('按 Shift + Command + Enter')).toBeInTheDocument()
	})

	it('没有快捷键 token 时不渲染空容器', () => {
		const { container } = render(<ShortcutTokens tokens={[]} />)

		expect(container).toBeEmptyDOMElement()
	})
})
