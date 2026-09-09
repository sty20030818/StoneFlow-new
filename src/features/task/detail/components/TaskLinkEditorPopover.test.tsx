import { Button } from '@heroui/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { TaskLinkEditorPopover } from './TaskLinkEditorPopover'

describe('TaskLinkEditorPopover', () => {
	it('同一会话保留草稿，取消重开恢复传入链接', async () => {
		const props = {
			mode: 'edit' as const,
			initialValue: { title: '设计文档', url: 'https://example.com/design' },
			onSubmit: vi.fn(async () => undefined),
			trigger: <Button>编辑链接</Button>,
		}
		const view = render(<TaskLinkEditorPopover {...props} />)
		fireEvent.click(screen.getByRole('button', { name: '编辑链接' }))
		const title = await screen.findByRole('textbox', { name: '链接标题' })
		fireEvent.change(title, { target: { value: '未保存草稿' } })
		view.rerender(<TaskLinkEditorPopover {...props} />)
		expect(screen.getByRole('textbox', { name: '链接标题' })).toHaveValue('未保存草稿')

		fireEvent.click(screen.getByRole('button', { name: '取消' }))
		fireEvent.click(screen.getByRole('button', { name: '编辑链接' }))
		expect(await screen.findByRole('textbox', { name: '链接标题' })).toHaveValue('设计文档')
		expect(screen.getByRole('textbox', { name: '链接 URL' })).toHaveValue(props.initialValue.url)
		expect(props.onSubmit).not.toHaveBeenCalled()
	})

	it('切换链接目标时清除旧错误和草稿，并提交当前目标字段', async () => {
		const onSubmit = vi
			.fn()
			.mockRejectedValueOnce(new Error('链接保存失败'))
			.mockResolvedValueOnce(undefined)
		const props = { mode: 'edit' as const, onSubmit, trigger: <Button>编辑链接</Button> }
		const view = render(
			<TaskLinkEditorPopover
				{...props}
				initialValue={{ title: '旧文档', url: 'https://example.com/old' }}
			/>,
		)
		fireEvent.click(screen.getByRole('button', { name: '编辑链接' }))
		fireEvent.click(await screen.findByRole('button', { name: '保存链接' }))
		expect(await screen.findByRole('alert')).toHaveTextContent('链接保存失败')

		const nextValue = { title: '新文档', url: 'https://example.com/new' }
		view.rerender(<TaskLinkEditorPopover {...props} initialValue={nextValue} />)
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		expect(screen.getByRole('textbox', { name: '链接标题' })).toHaveValue('新文档')
		fireEvent.click(screen.getByRole('button', { name: '保存链接' }))
		expect(onSubmit).toHaveBeenLastCalledWith(nextValue)
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
	})
})
