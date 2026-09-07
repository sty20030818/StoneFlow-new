import { Alert, Button, Label, Modal, TextArea, TextField, toast } from '@heroui/react'
import { useEffect, useId, useRef, useState } from 'react'

import type { SyncConfigSource, SyncDatabaseConfigInput } from '@/features/sync/api/sync'
import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'

type SyncConfigDialogProps = {
	open: boolean
	configSource: SyncConfigSource
	databaseUrl: string
	legacyRemoteAdoptionRequired: boolean
	legacyRemoteReason: string | null
	redactedRemoteUrl: string | null
	/** 仅表示「正在保存本弹窗」，不要绑全局同步中（否则会误禁用） */
	saving?: boolean
	onClose: () => void
	onAdoptLegacyRemote: () => Promise<void>
	onSave: (input: SyncDatabaseConfigInput) => Promise<void>
	onRebind: (input: SyncDatabaseConfigInput) => Promise<void>
	onDatabaseUrlChange: (value: string) => void
}

export function SyncConfigDialog({
	open,
	configSource,
	databaseUrl,
	legacyRemoteAdoptionRequired,
	legacyRemoteReason,
	redactedRemoteUrl,
	saving: savingExternal = false,
	onClose,
	onAdoptLegacyRemote,
	onSave,
	onRebind,
	onDatabaseUrlChange,
}: SyncConfigDialogProps) {
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [rebindRequired, setRebindRequired] = useState(false)
	const [editingReplacement, setEditingReplacement] = useState(false)
	const successToastIdRef = useRef<string | null>(null)
	const descriptionId = useId()
	const configIncomplete = databaseUrl.trim().length === 0
	const busy = saving || savingExternal
	const environmentManaged = configSource === 'environment'
	const showingLegacyAdoption = legacyRemoteAdoptionRequired && !editingReplacement

	useEffect(() => {
		if (!open) {
			setSaving(false)
			setError(null)
			setRebindRequired(false)
			setEditingReplacement(false)
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
			successToastIdRef.current = toast.success('配置已验证', {
				description: '已绑定远端，正在后台执行同步。',
			})
			onClose()
		} catch (saveError) {
			setRebindRequired(isConflictError(saveError))
			setError(normalizeTauriError(saveError, '同步配置保存失败'))
		} finally {
			setSaving(false)
		}
	}

	async function handleRebind() {
		if (busy || configIncomplete || !rebindRequired) return

		setError(null)
		setSaving(true)
		try {
			await onRebind({ databaseUrl: databaseUrl.trim() })
			successToastIdRef.current = toast.success('远端已重新绑定', {
				description: '正在后台执行同步。',
			})
			onClose()
		} catch (rebindError) {
			setError(normalizeTauriError(rebindError, '重新绑定远端失败'))
		} finally {
			setSaving(false)
		}
	}

	async function handleAdoptLegacyRemote() {
		if (busy || !showingLegacyAdoption) return

		setError(null)
		setSaving(true)
		try {
			await onAdoptLegacyRemote()
			successToastIdRef.current = toast.success('已沿用当前远端', {
				description: '本机数据与待上传变更均已保留，正在后台继续同步。',
			})
			onClose()
		} catch (adoptionError) {
			setError(normalizeTauriError(adoptionError, '沿用当前远端失败'))
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
						<Modal.Heading>
							{showingLegacyAdoption
								? '确认沿用当前远端'
								: environmentManaged
									? '开发同步配置'
									: '配置云端副本'}
						</Modal.Heading>
						<p className='text-sm leading-6 text-muted' id={descriptionId}>
							{showingLegacyAdoption
								? '请确认当前配置仍指向此前使用的同一个远端。'
								: environmentManaged
									? '开发构建只读取项目根目录 .env.local，不会写入系统钥匙串。'
									: '粘贴 Neon 或自建 Postgres 连接串。保存时会验证连接并确认远端实例身份。'}
						</p>
					</Modal.Header>

					<Modal.Body>
						{showingLegacyAdoption ? (
							<>
								<Alert status='warning'>
									<Alert.Indicator />
									<Alert.Content>
										<Alert.Title>只补齐当前远端身份</Alert.Title>
										<Alert.Description>
											{legacyRemoteReason ? `${legacyRemoteReason} ` : null}
											确认后不会清空本机数据、同步位置或待上传变更。若当前配置已改为另一套远端，旧同步位置可能跳过或混入历史变更，请先取消并检查配置。
										</Alert.Description>
									</Alert.Content>
								</Alert>
								<div className='rounded-lg border border-separator bg-surface-secondary px-3 py-2'>
									<p className='text-xs text-muted'>当前已配置远端（已脱敏）</p>
									<p className='mt-1 break-all text-sm text-foreground' data-code-field='true'>
										{redactedRemoteUrl ?? '安全地址不可用，请取消并检查当前配置'}
									</p>
								</div>
								{error ? (
									<Alert role='alert' status='danger'>
										<Alert.Indicator />
										<Alert.Content>
											<Alert.Title>沿用失败</Alert.Title>
											<Alert.Description>{error}</Alert.Description>
										</Alert.Content>
									</Alert>
								) : null}
							</>
						) : environmentManaged ? (
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
											setRebindRequired(false)
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
									完整连接串保存在系统钥匙串；界面只展示脱敏地址。若新串指向不同远端，会要求再次确认重新绑定。
								</p>
								{error ? (
									<Alert role='alert' status='danger'>
										<Alert.Indicator />
										<Alert.Content>
											<Alert.Title>{rebindRequired ? '需要确认重新绑定' : '保存失败'}</Alert.Title>
											<Alert.Description>
												{rebindRequired
													? `${error}。确认后：非空远端会替换本机已同步工作副本；空远端会保留本机内容并建立新基线。本机仍有待上传变更时会拒绝执行。`
													: `${error}。输入已保留，请检查后再次保存。`}
											</Alert.Description>
										</Alert.Content>
									</Alert>
								) : null}
							</>
						)}
					</Modal.Body>

					<Modal.Footer>
						<Button isDisabled={busy} onPress={onClose} type='button' variant='ghost'>
							{environmentManaged && !showingLegacyAdoption ? '关闭' : '取消'}
						</Button>
						{showingLegacyAdoption ? (
							<>
								{!environmentManaged ? (
									<Button
										isDisabled={busy}
										onPress={() => {
											setError(null)
											setRebindRequired(false)
											setEditingReplacement(true)
										}}
										type='button'
										variant='secondary'
									>
										改用其他远端
									</Button>
								) : null}
								<Button
									isDisabled={busy || !redactedRemoteUrl}
									isPending={busy}
									onPress={() => void handleAdoptLegacyRemote()}
									type='button'
								>
									确认沿用当前远端
								</Button>
							</>
						) : !environmentManaged ? (
							<Button
								isDisabled={busy || configIncomplete}
								isPending={busy}
								onPress={() => void (rebindRequired ? handleRebind() : handleSave())}
								type='button'
							>
								{rebindRequired ? '确认重新绑定' : '保存配置'}
							</Button>
						) : null}
					</Modal.Footer>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}

function isConflictError(error: unknown): boolean {
	return Boolean(error && typeof error === 'object' && 'type' in error && error.type === 'Conflict')
}
