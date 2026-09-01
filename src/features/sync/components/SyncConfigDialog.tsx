import { Alert, Button, Label, Modal, TextArea, TextField, toast } from '@heroui/react'
import { useEffect, useId, useRef, useState } from 'react'

import type { SyncConfigSource } from '@/features/sync/api/sync'
import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'

type SyncConfigDialogProps = {
	open: boolean
	configSource: SyncConfigSource
	databaseUrl: string
	/** 仅表示「正在保存本弹窗」，不要绑全局同步中（否则会误禁用） */
	saving?: boolean
	onClose: () => void
	onSave: (input: { databaseUrl: string }) => Promise<void>
	onDatabaseUrlChange: (value: string) => void
}

export function SyncConfigDialog({
	open,
	configSource,
	databaseUrl,
	saving: savingExternal = false,
	onClose,
	onSave,
	onDatabaseUrlChange,
}: SyncConfigDialogProps) {
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const successToastIdRef = useRef<string | null>(null)
	const descriptionId = useId()
	const configIncomplete = databaseUrl.trim().length === 0
	const busy = saving || savingExternal
	const environmentManaged = configSource === 'environment'

	useEffect(() => {
		if (!open) {
			setSaving(false)
			setError(null)
		}
	}, [open])

	async function handleSave() {
		if (busy || configIncomplete) return

		if (successToastIdRef.current) {
			toast.close(successToastIdRef.current)
			successToastIdRef.current = null
		}
		setError(null)
		setSaving(true)
		try {
			await onSave({ databaseUrl: databaseUrl.trim() })
			// 保存成功立刻关窗，不把后续状态刷新绑在弹窗上。
			successToastIdRef.current = toast.success('配置已保存', {
				description: '正在后台验证连接。',
			})
			onClose()
		} catch (saveError) {
			setError(normalizeTauriError(saveError, '同步配置保存失败'))
		} finally {
			setSaving(false)
		}
	}

	return (
		<Modal.Backdrop
			isDismissable={!busy}
			isOpen={open}
			onOpenChange={(nextOpen) => !nextOpen && !busy && onClose()}
		>
			<Modal.Container placement='center' size='lg'>
				<Modal.Dialog
					aria-describedby={descriptionId}
					className='min-w-0 overflow-hidden'
					render={(dialogProps) => (
						<section
							{...dialogProps}
							onKeyDown={(event) => {
								if (event.key !== 'Escape' || event.defaultPrevented) event.stopPropagation()
							}}
						/>
					)}
				>
					<Modal.Header>
						<Modal.Heading>{environmentManaged ? '开发同步配置' : '配置云端副本'}</Modal.Heading>
						<p className='text-sm leading-6 text-muted' id={descriptionId}>
							{environmentManaged
								? '开发构建只读取项目根目录 .env.local，不会写入系统钥匙串。'
								: '粘贴 Neon 或自建 Postgres 连接串。保存只写本机配置，不会立刻连库；连通性请用「立即同步」或诊断验证。'}
						</p>
					</Modal.Header>

					<Modal.Body>
						{environmentManaged ? (
							<Alert status='warning'>
								<Alert.Indicator />
								<Alert.Content>
									<Alert.Title>.env.local 是唯一配置来源</Alert.Title>
									<Alert.Description>
										设置 STONEFLOW_SYNC_DATABASE_URL
										后重启开发应用。此模式不会保存或覆盖任何本机凭据。
									</Alert.Description>
								</Alert.Content>
							</Alert>
						) : (
							<>
								<TextField fullWidth isDisabled={busy}>
									<Label>同步数据库连接</Label>
									{/* 连接串无空格超长：禁止 field-sizing 横向撑破弹窗，强制断行。 */}
									<TextArea
										autoFocus
										autoComplete='off'
										className='min-h-24 max-w-full resize-y overflow-x-hidden break-all field-sizing-fixed'
										data-code-field='true'
										onChange={(event) => {
											setError(null)
											onDatabaseUrlChange(event.currentTarget.value)
										}}
										placeholder={
											'postgresql://user:password@host:5432/dbname\n# 或带 sslmode：\n# postgresql://user:pass@host/db?sslmode=require'
										}
										spellCheck={false}
										value={databaseUrl}
									/>
								</TextField>
								<p className='my-2 text-xs leading-5 text-muted'>
									完整连接串保存在系统钥匙串；界面只展示脱敏地址。更换时粘贴新串覆盖即可。
								</p>
								{error ? (
									<Alert role='alert' status='danger'>
										<Alert.Indicator />
										<Alert.Content>
											<Alert.Title>保存失败</Alert.Title>
											<Alert.Description>{error}。输入已保留，请检查后再次保存。</Alert.Description>
										</Alert.Content>
									</Alert>
								) : null}
							</>
						)}
					</Modal.Body>

					<Modal.Footer>
						<Button isDisabled={busy} onPress={onClose} type='button' variant='ghost'>
							{environmentManaged ? '关闭' : '取消'}
						</Button>
						{!environmentManaged ? (
							<Button
								isDisabled={busy || configIncomplete}
								isPending={busy}
								onPress={() => void handleSave()}
								type='button'
							>
								保存配置
							</Button>
						) : null}
					</Modal.Footer>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}
