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
			indicatorClassName: 'bg-(--sf-color-shell-online)',
			kind: 'ready',
			label: '本地数据库已连接',
			title: '/tmp/StoneFlow/app.db',
		})

		render(<ShellFooter navBadges={{ inbox: '3', allTasks: '12' }} />)

		expect(screen.getByText('本地数据库已连接')).toBeInTheDocument()
		expect(screen.getByText('收件箱')).toBeInTheDocument()
		expect(screen.getByText('3')).toBeInTheDocument()
		expect(screen.getByText('任务')).toBeInTheDocument()
		expect(screen.getByText('12')).toBeInTheDocument()
	})
})
