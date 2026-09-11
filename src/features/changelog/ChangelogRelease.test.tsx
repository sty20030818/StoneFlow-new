import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ChangelogRelease, ChangelogReleaseContent } from './ChangelogRelease'

describe('ChangelogRelease', () => {
	it('渲染版本、规范分类和撤回状态', () => {
		render(
			<ChangelogRelease
				release={{
					version: '1.2.0-beta.3',
					date: '2026-08-07',
					yanked: true,
					sections: new Map([
						['新增', '- 新功能'],
						['修复', '- 修复问题'],
					]),
				}}
			/>,
		)

		expect(screen.getByRole('heading', { level: 3, name: 'v1.2.0-beta.3' })).toBeInTheDocument()
		expect(screen.getByRole('heading', { level: 4, name: '新增' })).toBeInTheDocument()
		expect(screen.getByText('2026-08-07')).toBeInTheDocument()
		expect(screen.getByText('修复问题')).toBeInTheDocument()
		expect(screen.getByText('已撤回')).toBeInTheDocument()
	})

	it('合法分类中的围栏标题不会变成发布结构', () => {
		const { container } = render(
			<ChangelogRelease
				release={{
					version: '1.2.0',
					date: '2026-08-07',
					yanked: false,
					sections: new Map([['安全', '```text\n## [9.9.9]\n### 安全\n```']]),
				}}
			/>,
		)

		expect(screen.getAllByRole('heading')).toHaveLength(2)
		expect(container.querySelector('code')).toHaveTextContent('## [9.9.9] ### 安全')
	})

	it('正文只展示分类、保留嵌套列表并隐藏水平分割线', () => {
		render(
			<ChangelogReleaseContent
				headingLevel={3}
				release={{
					version: '1.2.0',
					date: '2026-08-07',
					yanked: false,
					sections: new Map([['变更', '- **更新系统全面重构**\n  - 从检查到下载到安装。\n\n---']]),
				}}
			/>,
		)

		expect(screen.queryByRole('heading', { name: 'v1.2.0' })).not.toBeInTheDocument()
		expect(screen.getByRole('heading', { level: 3, name: '变更' })).toBeInTheDocument()
		expect(screen.queryByText('2026-08-07')).not.toBeInTheDocument()
		expect(screen.queryByRole('separator')).not.toBeInTheDocument()
		const items = screen.getAllByRole('listitem')
		expect(items).toHaveLength(2)
		expect(items[0]).toContainElement(items[1])
	})

	it('保留安全链接和换行，不执行原始 HTML 或危险链接', () => {
		const { container } = render(
			<ChangelogReleaseContent
				release={{
					version: '1.2.0',
					date: '2026-08-07',
					yanked: false,
					sections: new Map([
						[
							'安全',
							'第一行\n第二行\n\n[项目网站](https://example.com)\n\n[危险链接](javascript:alert%281%29)\n\n<script>alert(1)</script>\n\n<img src=x onerror="alert(1)" />',
						],
					]),
				}}
			/>,
		)

		expect(screen.getByRole('link', { name: '项目网站' })).toHaveAttribute(
			'href',
			'https://example.com',
		)
		expect(screen.getByText('危险链接')).toHaveAttribute('href', '')
		expect(container.querySelector('br')).toBeInTheDocument()
		expect(container.querySelector('script, img')).not.toBeInTheDocument()
	})
})
