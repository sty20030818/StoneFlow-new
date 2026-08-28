import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

import type { SyncConfigSource } from '@/features/sync/api/sync'

import { SyncConfigDialog } from './SyncConfigDialog'

describe('SyncConfigDialog', () => {
	it('修剪连接串后保存并关闭', async () => {
		const onSave = vi.fn(async () => undefined)
		const onClose = vi.fn()
		render(<DialogHarness configSource='system_keychain' onClose={onClose} onSave={onSave} />)

		fireEvent.change(screen.getByRole('textbox', { name: '同步数据库连接' }), {
			target: { value: '  postgresql://user:secret@db.example.com/sf  ' },
		})
		fireEvent.click(screen.getByRole('button', { name: '保存配置' }))

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith({
				databaseUrl: 'postgresql://user:secret@db.example.com/sf',
			})
			expect(onClose).toHaveBeenCalledTimes(1)
		})
	})

	it('环境配置只展示说明，不暴露凭据写入', () => {
		render(
			<DialogHarness
				configSource='environment'
				onClose={vi.fn()}
				onSave={vi.fn(async () => undefined)}
			/>,
		)

		expect(screen.getByText('.env.local 是唯一配置来源')).toBeInTheDocument()
		expect(screen.queryByRole('textbox', { name: '同步数据库连接' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '保存配置' })).not.toBeInTheDocument()
	})

	it('保存失败时保留输入并只提供可防重复提交的危险重试', async () => {
		const onClose = vi.fn()
		let resolveRetry: (() => void) | undefined
		const retryPending = new Promise<void>((resolve) => {
			resolveRetry = resolve
		})
		const onSave = vi
			.fn<(input: { databaseUrl: string }) => Promise<void>>()
			.mockRejectedValueOnce(new Error('连接被拒绝'))
			.mockImplementationOnce(() => retryPending)
		render(<DialogHarness configSource='system_keychain' onClose={onClose} onSave={onSave} />)

		const databaseUrl = screen.getByRole('textbox', { name: '同步数据库连接' })
		fireEvent.change(databaseUrl, {
			target: { value: 'postgresql://db.example.com/sf' },
		})
		fireEvent.click(screen.getByRole('button', { name: '保存配置' }))

		expect(await screen.findByRole('alert')).toHaveTextContent('连接被拒绝')
		expect(databaseUrl).toHaveValue('postgresql://db.example.com/sf')
		expect(screen.queryByRole('button', { name: '保存配置' })).not.toBeInTheDocument()

		const retryButton = screen.getByRole('button', { name: '重试保存' })
		fireEvent.click(retryButton)
		await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))
		expect(retryButton).toBeDisabled()
		fireEvent.click(retryButton)
		expect(onSave).toHaveBeenCalledTimes(2)

		resolveRetry?.()
		await waitFor(() => {
			expect(onClose).toHaveBeenCalledTimes(1)
			expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		})
	})
})

function DialogHarness({
	configSource,
	onClose,
	onSave,
}: {
	configSource: SyncConfigSource
	onClose: () => void
	onSave: (input: { databaseUrl: string }) => Promise<void>
}) {
	const [databaseUrl, setDatabaseUrl] = useState('')

	return (
		<SyncConfigDialog
			configSource={configSource}
			databaseUrl={databaseUrl}
			onClose={onClose}
			onDatabaseUrlChange={setDatabaseUrl}
			onSave={onSave}
			open
		/>
	)
}
