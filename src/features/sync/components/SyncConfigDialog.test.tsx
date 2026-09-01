import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Toast, toast } from '@heroui/react'
import { useState } from 'react'

import type { SyncConfigSource } from '@/features/sync/api/sync'

import { SyncConfigDialog } from './SyncConfigDialog'

describe('SyncConfigDialog', () => {
	beforeEach(() => {
		act(() => toast.clear())
	})

	afterEach(() => {
		act(() => toast.clear())
	})

	it('修剪连接串后保存并关闭', async () => {
		const onSave = vi.fn(async () => undefined)
		const onClose = vi.fn()
		render(<DialogHarness configSource='system_keychain' onClose={onClose} onSave={onSave} />)

		const databaseUrl = screen.getByRole('textbox', { name: '同步数据库连接' })
		await waitFor(() => expect(databaseUrl).toHaveFocus())
		fireEvent.change(databaseUrl, {
			target: { value: '  postgresql://user:secret@db.example.com/sf  ' },
		})
		fireEvent.click(screen.getByRole('button', { name: '保存配置' }))

		await waitFor(() => {
			expect(onSave).toHaveBeenCalledWith({
				databaseUrl: 'postgresql://user:secret@db.example.com/sf',
			})
			expect(onClose).toHaveBeenCalledTimes(1)
			expect(screen.queryByRole('dialog', { name: '配置云端副本' })).not.toBeInTheDocument()
		})
		const successToast = await screen.findByRole('alertdialog', { name: '配置已保存' })
		expect(successToast).toBeVisible()
		expect(successToast).toHaveTextContent('正在后台验证连接。')
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

	it('保存失败时在弹窗内显示 Alert、保留输入，并通过原位主按钮再次保存', async () => {
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
		const saveButton = screen.getByRole('button', { name: '保存配置' })
		fireEvent.click(saveButton)

		const dialog = screen.getByRole('dialog', { name: '配置云端副本' })
		const inlineError = await within(dialog).findByRole('alert')
		expect(inlineError).toHaveTextContent('保存失败')
		expect(inlineError).toHaveTextContent('连接被拒绝')
		expect(inlineError).toHaveTextContent('输入已保留，请检查后再次保存。')
		expect(dialog).toBeInTheDocument()
		expect(onClose).not.toHaveBeenCalled()
		expect(databaseUrl).toHaveValue('postgresql://db.example.com/sf')
		expect(databaseUrl).not.toHaveAttribute('aria-invalid', 'true')
		expect(screen.queryByRole('alertdialog', { name: '保存失败' })).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: '保存配置' })).toBe(saveButton)
		expect(screen.queryByRole('button', { name: '重试保存' })).not.toBeInTheDocument()

		await waitFor(() => expect(saveButton).toBeEnabled())
		fireEvent.click(saveButton)
		await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))
		expect(saveButton).toBeDisabled()
		fireEvent.click(saveButton)
		expect(onSave).toHaveBeenCalledTimes(2)

		resolveRetry?.()
		await waitFor(() => {
			expect(onClose).toHaveBeenCalledTimes(1)
			expect(screen.queryByRole('dialog', { name: '配置云端副本' })).not.toBeInTheDocument()
		})
		expect(await screen.findByRole('alertdialog', { name: '配置已保存' })).toBeVisible()
		expect(screen.queryByRole('alertdialog', { name: '保存失败' })).not.toBeInTheDocument()
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
	const [open, setOpen] = useState(true)

	function handleClose() {
		setOpen(false)
		onClose()
	}

	return (
		<>
			<SyncConfigDialog
				configSource={configSource}
				databaseUrl={databaseUrl}
				onClose={handleClose}
				onDatabaseUrlChange={setDatabaseUrl}
				onSave={onSave}
				open={open}
			/>
			<Toast.Provider placement='bottom end' />
		</>
	)
}
