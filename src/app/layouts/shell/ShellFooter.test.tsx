import { render, screen } from '@testing-library/react'

import { ShellFooter } from '@/app/layouts/shell/ShellFooter'
import { useHealthcheckStatus } from '@/features/healthcheck/model/useHealthcheckStatus'

vi.mock('@/features/healthcheck/model/useHealthcheckStatus', () => ({
	useHealthcheckStatus: vi.fn<typeof useHealthcheckStatus>(),
}))

const mockedUseHealthcheckStatus = vi.mocked(useHealthcheckStatus)

describe('ShellFooter', () => {
	it('保留状态与页面信息，但不再渲染 Trash 和 Settings 按钮', () => {
		mockedUseHealthcheckStatus.mockReturnValue({
			detail: '...\\StoneFlow\\app.db',
			indicatorClassName: 'bg-(--sf-color-shell-online)',
			kind: 'ready',
			label: '本地数据库已连接',
			title: '/tmp/StoneFlow/app.db',
		})

		render(<ShellFooter activeSection='trash' currentSpaceId='work' />)

		expect(screen.getByText('本地数据库已连接')).toBeInTheDocument()
		expect(screen.getByText('工作')).toBeInTheDocument()
		expect(screen.getAllByText('Trash')[0]).toBeInTheDocument()
		expect(screen.queryByRole('button')).not.toBeInTheDocument()
	})
})
