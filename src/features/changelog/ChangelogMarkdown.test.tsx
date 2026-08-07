import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ChangelogMarkdown } from './ChangelogMarkdown'

describe('ChangelogMarkdown', () => {
	it('忽略 Markdown 水平分割线', () => {
		render(<ChangelogMarkdown content={'### 修复\n\n- 修复发布问题。\n\n---'} />)

		expect(screen.getByRole('heading', { name: '修复' })).toBeInTheDocument()
		expect(screen.getByText('修复发布问题。')).toBeInTheDocument()
		expect(screen.queryByText('---')).not.toBeInTheDocument()
	})

	it('渲染缩进的子列表', () => {
		render(<ChangelogMarkdown content={'- **更新系统全面重构**\n  - 从检查到下载到安装。'} />)

		const items = screen.getAllByRole('listitem')
		expect(items).toHaveLength(2)
		expect(items[1]).toHaveClass('ml-5')
	})

	it('围栏中的标题按代码原文展示', () => {
		const { container } = render(
			<ChangelogMarkdown content={'```text\n## [9.9.9]\n### Security\n```'} />,
		)

		expect(screen.queryByRole('heading')).not.toBeInTheDocument()
		expect(container.querySelector('code')).toHaveTextContent('## [9.9.9] ### Security')
		expect(screen.queryByText('```text')).not.toBeInTheDocument()
	})
})
