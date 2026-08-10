import { render, screen } from '@testing-library/react'

import { ShortcutTokens } from './ShortcutTokens'

describe('ShortcutTokens', () => {
	it('chord 在未显式传文案时仍提供顺序输入语义', () => {
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
		expect(screen.getByText('G')).toHaveAttribute('aria-hidden', 'true')
		expect(screen.getByText('T')).toHaveAttribute('aria-hidden', 'true')
	})
})
