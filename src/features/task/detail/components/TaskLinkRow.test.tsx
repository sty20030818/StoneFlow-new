import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { TooltipProvider } from '@/shared/components/base/tooltip'
import type { TaskLink } from '@/shared/types'

import { TaskLinkRow } from './TaskLinkRow'

const link: TaskLink = {
	id: 'link-1',
	taskId: 'task-1',
	title: '一份很长的技术方案文档',
	url: 'https://example.com/engineering/specification',
	position: 0,
	createdAt: '2026-08-10T00:00:00.000Z',
	updatedAt: '2026-08-10T00:00:00.000Z',
}

describe('TaskLinkRow', () => {
	it('链接文本使用溢出提示，更多菜单打开时关闭动作提示', async () => {
		const { container } = render(
			<TooltipProvider delayDuration={0}>
				<TaskLinkRow
					link={link}
					onEdit={async () => undefined}
					onOpen={() => undefined}
					onRemove={async () => undefined}
				/>
			</TooltipProvider>,
		)

		expect(container.querySelectorAll('[data-slot="overflow-tooltip-trigger"]')).toHaveLength(2)

		const more = screen.getByRole('button', { name: `更多链接操作：${link.title}` })
		fireEvent.focus(more)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('更多链接操作')

		fireEvent.pointerDown(more, { button: 0, ctrlKey: false })
		expect(await screen.findByRole('menuitem', { name: '编辑链接' })).toBeInTheDocument()
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})
})
