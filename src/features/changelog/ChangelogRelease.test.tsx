import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ChangelogRelease } from './ChangelogRelease'

describe('ChangelogRelease', () => {
	it('渲染版本、规范分类和撤回状态', () => {
		render(
			<ChangelogRelease
				release={{
					version: '1.2.0-beta.3',
					date: '2026-08-07',
					yanked: true,
					sections: new Map([
						['Added', '- 新功能'],
						['Fixed', '- 修复问题'],
					]),
				}}
			/>,
		)

		expect(screen.getByRole('heading', { name: 'v1.2.0-beta.3' })).toBeInTheDocument()
		expect(screen.getByRole('heading', { name: '新增' })).toBeInTheDocument()
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
					sections: new Map([['Security', '```text\n## [9.9.9]\n### Security\n```']]),
				}}
			/>,
		)

		expect(screen.getAllByRole('heading')).toHaveLength(2)
		expect(container.querySelector('code')).toHaveTextContent('## [9.9.9] ### Security')
	})
})
