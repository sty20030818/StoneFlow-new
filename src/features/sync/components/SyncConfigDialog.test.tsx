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

	it.each([false, true])('首尾 Tab 回绕（Shift=%s）', (shiftKey) => {
		render(
			<DialogHarness
				configSource='system_keychain'
				onClose={vi.fn()}
				onSave={vi.fn(async () => undefined)}
			/>,
		)
		fireEvent.change(screen.getByRole('textbox', { name: '同步数据库连接' }), {
			target: { value: 'postgresql://db.example.com/sf' },
		})
		const first = screen.getByRole('button', { name: '关闭同步配置' })
		const last = screen.getByRole('button', { name: '保存配置' })
		const source = shiftKey ? first : last
		const target = shiftKey ? last : first
		act(() => source.focus())
		expect(source).toHaveFocus()

		fireEvent.keyDown(source, { key: 'Tab', shiftKey })

		expect(target).toHaveFocus()
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
		const successToast = await screen.findByRole('alertdialog', { name: '配置已验证' })
		expect(successToast).toBeVisible()
		expect(successToast).toHaveTextContent('已绑定远端，正在后台执行同步。')
	})

	it('环境配置只展示说明，可通过标题关闭按钮退出，不暴露凭据写入', async () => {
		const onClose = vi.fn()
		const onSave = vi.fn(async () => undefined)
		render(<DialogHarness configSource='environment' onClose={onClose} onSave={onSave} />)

		expect(screen.getByText('.env.local 是唯一配置来源')).toBeInTheDocument()
		expect(screen.queryByRole('textbox', { name: '同步数据库连接' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '保存配置' })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '关闭同步配置' }))
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		expect(onClose).toHaveBeenCalledOnce()
		expect(onSave).not.toHaveBeenCalled()
	})

	it('关闭重开清除上轮保存错误，连接串草稿仍由调用方保留', async () => {
		const props = {
			configSource: 'system_keychain' as const,
			databaseUrl: 'postgresql://db.example.com/sf',
			legacyRemoteAdoptionRequired: false,
			legacyRemoteReason: null,
			redactedRemoteUrl: null,
			onClose: vi.fn(),
			onAdoptLegacyRemote: vi.fn(async () => undefined),
			onSave: vi.fn().mockRejectedValue(new Error('连接被拒绝')),
			onRebind: vi.fn(async () => undefined),
			onDatabaseUrlChange: vi.fn(),
		}
		const view = render(<SyncConfigDialog {...props} open />)
		fireEvent.click(screen.getByRole('button', { name: '保存配置' }))
		expect(await screen.findByRole('alert')).toHaveTextContent('连接被拒绝')
		view.rerender(<SyncConfigDialog {...props} open />)
		expect(screen.getByRole('alert')).toHaveTextContent('连接被拒绝')

		view.rerender(<SyncConfigDialog {...props} open={false} />)
		view.rerender(<SyncConfigDialog {...props} open />)
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		expect(screen.getByRole('textbox', { name: '同步数据库连接' })).toHaveValue(props.databaseUrl)
		expect(screen.getByRole('button', { name: '保存配置' })).toBeEnabled()
	})

	it('环境配置存在旧游标时可显式沿用当前远端且不接收连接串', async () => {
		const onAdoptLegacyRemote = vi.fn(async () => undefined)
		const onClose = vi.fn()
		render(
			<DialogHarness
				configSource='environment'
				legacyRemoteAdoptionRequired
				legacyRemoteReason='本机保留了旧同步位置，但还没有远端身份。'
				onAdoptLegacyRemote={onAdoptLegacyRemote}
				onClose={onClose}
				onSave={vi.fn(async () => undefined)}
			/>,
		)

		expect(screen.getByRole('dialog', { name: '确认沿用当前远端' })).toHaveTextContent(
			'不会清空本机数据、同步位置或待上传变更',
		)
		expect(screen.getByText('postgresql://db.example.com:5432/sf')).toBeVisible()
		expect(screen.queryByText(/user:secret|sslmode=/)).not.toBeInTheDocument()
		expect(screen.queryByRole('textbox', { name: '同步数据库连接' })).not.toBeInTheDocument()
		fireEvent.click(screen.getByRole('button', { name: '确认沿用当前远端' }))

		await waitFor(() => {
			expect(onAdoptLegacyRemote).toHaveBeenCalledWith()
			expect(onClose).toHaveBeenCalledTimes(1)
		})
	})

	it('沿用当前远端进行中阻止重复提交，失败后可原位重试', async () => {
		let resolveRetry: (() => void) | undefined
		const retryPending = new Promise<void>((resolve) => {
			resolveRetry = resolve
		})
		const onAdoptLegacyRemote = vi
			.fn<() => Promise<void>>()
			.mockRejectedValueOnce(new Error('远端序号落后'))
			.mockImplementationOnce(() => retryPending)
		render(
			<DialogHarness
				configSource='system_keychain'
				legacyRemoteAdoptionRequired
				legacyRemoteReason='需要确认旧同步位置。'
				onAdoptLegacyRemote={onAdoptLegacyRemote}
				onClose={vi.fn()}
				onSave={vi.fn(async () => undefined)}
			/>,
		)

		const adoptButton = screen.getByRole('button', { name: '确认沿用当前远端' })
		fireEvent.click(adoptButton)
		expect(await screen.findByRole('alert')).toHaveTextContent('远端序号落后')

		fireEvent.click(adoptButton)
		await waitFor(() => expect(onAdoptLegacyRemote).toHaveBeenCalledTimes(2))
		expect(adoptButton).toBeDisabled()
		fireEvent.click(adoptButton)
		expect(onAdoptLegacyRemote).toHaveBeenCalledTimes(2)

		resolveRetry?.()
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '确认沿用当前远端' })).not.toBeInTheDocument(),
		)
	})

	it('钥匙串配置可退出沿用流程并改用其他远端', () => {
		render(
			<DialogHarness
				configSource='system_keychain'
				legacyRemoteAdoptionRequired
				legacyRemoteReason='需要确认旧同步位置。'
				onClose={vi.fn()}
				onSave={vi.fn(async () => undefined)}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: '改用其他远端' }))

		expect(screen.getByRole('textbox', { name: '同步数据库连接' })).toBeVisible()
		expect(screen.getByRole('button', { name: '保存配置' })).toBeVisible()
		expect(screen.queryByRole('button', { name: '确认沿用当前远端' })).not.toBeInTheDocument()
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
		const closeButton = screen.getByRole('button', { name: '关闭同步配置' })
		expect(closeButton).toBeDisabled()
		fireEvent.click(closeButton)
		fireEvent.keyDown(dialog, { key: 'Escape' })
		expect(onClose).not.toHaveBeenCalled()
		expect(dialog).toBeInTheDocument()
		fireEvent.click(saveButton)
		expect(onSave).toHaveBeenCalledTimes(2)

		resolveRetry?.()
		await waitFor(() => {
			expect(onClose).toHaveBeenCalledTimes(1)
			expect(screen.queryByRole('dialog', { name: '配置云端副本' })).not.toBeInTheDocument()
		})
		expect(await screen.findByRole('alertdialog', { name: '配置已验证' })).toBeVisible()
		expect(screen.queryByRole('alertdialog', { name: '保存失败' })).not.toBeInTheDocument()
	})

	it('远端实例冲突时要求显式确认，并在有 pending outbox 时保留输入与弹窗', async () => {
		const onClose = vi.fn()
		const onSave = vi.fn().mockRejectedValue({
			type: 'Conflict',
			message: '同步远端实例与本机游标绑定不一致',
		})
		const onRebind = vi.fn().mockRejectedValue(new Error('本机仍有 2 条待上传变更'))
		render(
			<DialogHarness
				configSource='system_keychain'
				onClose={onClose}
				onRebind={onRebind}
				onSave={onSave}
			/>,
		)

		const databaseUrl = screen.getByRole('textbox', { name: '同步数据库连接' })
		fireEvent.change(databaseUrl, {
			target: { value: 'postgresql://user:secret@other.example.com/sf' },
		})
		fireEvent.click(screen.getByRole('button', { name: '保存配置' }))

		const dialog = screen.getByRole('dialog', { name: '配置云端副本' })
		const rebindButton = await within(dialog).findByRole('button', { name: '确认重新绑定' })
		expect(within(dialog).getByRole('alert')).toHaveTextContent('非空远端会替换本机已同步工作副本')
		expect(within(dialog).getByRole('alert')).toHaveTextContent('本机仍有待上传变更时会拒绝执行')

		fireEvent.click(rebindButton)
		await waitFor(() => expect(onRebind).toHaveBeenCalledTimes(1))
		expect(await within(dialog).findByText(/本机仍有 2 条待上传变更/)).toBeVisible()
		expect(databaseUrl).toHaveValue('postgresql://user:secret@other.example.com/sf')
		expect(onClose).not.toHaveBeenCalled()
		expect(rebindButton).toBeEnabled()
	})
})

function DialogHarness({
	configSource,
	legacyRemoteAdoptionRequired = false,
	legacyRemoteReason = null,
	onAdoptLegacyRemote = vi.fn(async () => undefined),
	redactedRemoteUrl = 'postgresql://db.example.com:5432/sf',
	onClose,
	onSave,
	onRebind = vi.fn(async () => undefined),
}: {
	configSource: SyncConfigSource
	legacyRemoteAdoptionRequired?: boolean
	legacyRemoteReason?: string | null
	onAdoptLegacyRemote?: () => Promise<void>
	redactedRemoteUrl?: string | null
	onClose: () => void
	onSave: (input: { databaseUrl: string }) => Promise<void>
	onRebind?: (input: { databaseUrl: string }) => Promise<void>
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
				legacyRemoteAdoptionRequired={legacyRemoteAdoptionRequired}
				legacyRemoteReason={legacyRemoteReason}
				onAdoptLegacyRemote={onAdoptLegacyRemote}
				redactedRemoteUrl={redactedRemoteUrl}
				onClose={handleClose}
				onDatabaseUrlChange={setDatabaseUrl}
				onRebind={onRebind}
				onSave={onSave}
				open={open}
			/>
			<Toast.Provider placement='bottom end' />
		</>
	)
}
