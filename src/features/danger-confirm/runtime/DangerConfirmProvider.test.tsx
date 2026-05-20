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
		expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
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
