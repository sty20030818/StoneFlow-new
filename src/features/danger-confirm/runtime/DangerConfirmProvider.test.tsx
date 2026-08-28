import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { DangerConfirmProvider, useDangerConfirm } from '@/features/danger-confirm'

describe('DangerConfirmProvider', () => {
	it('confirm / cancel / 替换请求都会正确结算 Promise', async () => {
		render(
			<DangerConfirmProvider>
				<TestHarness />
			</DangerConfirmProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: '请求归档确认' }))
		expect(await screen.findByRole('alertdialog')).toHaveAccessibleDescription(
			'归档后可在归档页恢复。',
		)
		expect(screen.getByText('确认归档「任务 A」吗？')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '归档' }))
		await waitFor(() => {
			expect(screen.getByTestId('first-result')).toHaveTextContent('confirmed')
		})

		fireEvent.click(screen.getByRole('button', { name: '请求回收站确认' }))
		expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
		expect(screen.getByText('确认移入回收站「项目 A」吗？')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '取消' }))
		await waitFor(() => {
			expect(screen.getByTestId('second-result')).toHaveTextContent('cancelled')
		})

		fireEvent.click(screen.getByRole('button', { name: '请求双重确认' }))
		await waitFor(() => {
			expect(screen.getByTestId('replace-first-result')).toHaveTextContent('cancelled')
		})
		expect(screen.getByText('确认移入回收站「项目 B」吗？')).toBeInTheDocument()
	})

	it('外点不关闭，Escape 取消并将焦点归还给触发按钮', async () => {
		render(
			<DangerConfirmProvider>
				<TestHarness />
			</DangerConfirmProvider>,
		)

		const trigger = screen.getByRole('button', { name: '请求回收站确认' })
		trigger.focus()
		fireEvent.click(trigger)
		expect(await screen.findByRole('alertdialog')).toBeInTheDocument()

		const backdrop = document.querySelector('[data-slot="alert-dialog-backdrop"]')
		expect(backdrop).not.toBeNull()
		fireEvent.click(backdrop!)
		expect(screen.getByRole('alertdialog')).toBeInTheDocument()

		fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
		await waitFor(() => {
			expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
			expect(screen.getByTestId('second-result')).toHaveTextContent('cancelled')
			expect(trigger).toHaveFocus()
		})
	})

	it('Dialog 根节点阻断字符键，默认 Enter 确认当前请求', async () => {
		const onWindowKeyDown = vi.fn()
		window.addEventListener('keydown', onWindowKeyDown)

		try {
			render(
				<DangerConfirmProvider>
					<TestHarness />
				</DangerConfirmProvider>,
			)

			fireEvent.click(screen.getByRole('button', { name: '请求归档确认' }))
			const dialog = await screen.findByRole('alertdialog')
			await waitFor(() => expect(dialog).toHaveFocus())

			fireEvent.keyDown(dialog, { key: 'w' })
			expect(onWindowKeyDown).not.toHaveBeenCalled()

			fireEvent.keyDown(dialog, { key: 'Enter' })
			await waitFor(() => expect(screen.getByTestId('first-result')).toHaveTextContent('confirmed'))
			expect(onWindowKeyDown).not.toHaveBeenCalled()
		} finally {
			window.removeEventListener('keydown', onWindowKeyDown)
		}
	})
})

function TestHarness() {
	const { requestDangerConfirm } = useDangerConfirm()

	return (
		<div>
			<button
				onClick={() => {
					void requestDangerConfirm({
						intent: 'archive',
						entityType: 'task',
						count: 1,
						entityLabel: '任务 A',
					}).then((confirmed) => {
						const output = document.querySelector('[data-testid="first-result"]')
						if (output) {
							output.textContent = confirmed ? 'confirmed' : 'cancelled'
						}
					})
				}}
				type='button'
			>
				请求归档确认
			</button>
			<button
				onClick={() => {
					void requestDangerConfirm({
						intent: 'trash',
						entityType: 'project',
						count: 1,
						entityLabel: '项目 A',
					}).then((confirmed) => {
						const output = document.querySelector('[data-testid="second-result"]')
						if (output) {
							output.textContent = confirmed ? 'confirmed' : 'cancelled'
						}
					})
				}}
				type='button'
			>
				请求回收站确认
			</button>
			<button
				onClick={() => {
					void requestDangerConfirm({
						intent: 'archive',
						entityType: 'task',
						count: 1,
						entityLabel: '任务 B',
					}).then((confirmed) => {
						const output = document.querySelector('[data-testid="replace-first-result"]')
						if (output) {
							output.textContent = confirmed ? 'confirmed' : 'cancelled'
						}
					})

					void requestDangerConfirm({
						intent: 'trash',
						entityType: 'project',
						count: 1,
						entityLabel: '项目 B',
					})
				}}
				type='button'
			>
				请求双重确认
			</button>
			<output data-testid='first-result'>pending</output>
			<output data-testid='second-result'>pending</output>
			<output data-testid='replace-first-result'>pending</output>
		</div>
	)
}
