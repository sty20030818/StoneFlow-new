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

	it('保存失败时保留弹窗并静态报告错误', async () => {
		const onClose = vi.fn()
		render(
			<DialogHarness
				configSource='system_keychain'
				onClose={onClose}
				onSave={vi.fn(async () => {
					throw new Error('连接被拒绝')
				})}
			/>,
		)

		fireEvent.change(screen.getByRole('textbox', { name: '同步数据库连接' }), {
			target: { value: 'postgresql://db.example.com/sf' },
		})
		fireEvent.click(screen.getByRole('button', { name: '保存配置' }))

		expect(await screen.findByRole('alert')).toHaveTextContent('连接被拒绝')
		expect(onClose).not.toHaveBeenCalled()
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
