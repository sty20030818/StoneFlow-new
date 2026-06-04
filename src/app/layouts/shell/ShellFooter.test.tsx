import { render, screen } from '@testing-library/react'

import { ShellFooter } from '@/app/layouts/shell/ShellFooter'
import { useHealthcheckStatus } from '@/features/healthcheck/model/useHealthcheckStatus'

vi.mock('@/features/healthcheck/model/useHealthcheckStatus', () => ({
	useHealthcheckStatus: vi.fn<typeof useHealthcheckStatus>(),
}))

const mockedUseHealthcheckStatus = vi.mocked(useHealthcheckStatus)

describe('ShellFooter', () => {
	it('渲染健康状态与导航计数', () => {
		mockedUseHealthcheckStatus.mockReturnValue({
			detail: '...\\StoneFlow\\app.db',
			indicatorClassName: 'bg-sf-shell-online',
			kind: 'ready',
			label: '本地数据库已连接',
			title: '/tmp/StoneFlow/app.db',
		})

		const { container } = render(<ShellFooter navBadges={{ inbox: '3', tasks: '12' }} />)

		expect(container.querySelector('[title="/tmp/StoneFlow/app.db"]')).toBeInTheDocument()
		expect(screen.getByText('收件箱')).toBeInTheDocument()
		expect(screen.getByText('3')).toBeInTheDocument()
		expect(screen.getByText('任务')).toBeInTheDocument()
		expect(screen.getByText('12')).toBeInTheDocument()
	})
})
