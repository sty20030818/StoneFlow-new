import { useEffect, useState } from 'react'

import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'
import { StatusNotice } from '@/shared/components/StatusNotice'
import { Button } from '@/shared/components/base/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/shared/components/base/dialog'
import { Input } from '@/shared/components/base/input'
import {
	dialogShellBodyClass,
	dialogShellContentVariants,
	dialogShellDescriptionClass,
	dialogShellFooterClass,
	dialogShellHeaderClass,
	dialogShellPanelFooterClass,
	dialogShellTitleClass,
} from '@/shared/components/patterns/dialog-shell'
import {
	formFieldHintClass,
	formFieldLabelVariants,
	formFieldStackClass,
} from '@/shared/components/patterns/form-field'

type SyncConfigDialogProps = {
	open: boolean
	syncUrl: string
	syncToken: string
	syncBusy: boolean
	onClose: () => void
	onSave: (input: { url: string; token: string }) => Promise<void>
	onSyncUrlChange: (value: string) => void
	onSyncTokenChange: (value: string) => void
}

export function SyncConfigDialog({
	open,
	syncUrl,
	syncToken,
	syncBusy,
	onClose,
	onSave,
	onSyncUrlChange,
	onSyncTokenChange,
}: SyncConfigDialogProps) {
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const configIncomplete = syncUrl.trim().length === 0 || syncToken.trim().length === 0

	useEffect(() => {
		if (!open) {
			setSaving(false)
			setError(null)
		}
	}, [open])

	async function handleSave() {
		setSaving(true)
		setError(null)
		try {
			await onSave({
				url: syncUrl.trim(),
				token: syncToken.trim(),
			})
			onClose()
		} catch (saveError) {
			setError(normalizeTauriError(saveError, '同步配置保存失败'))
		} finally {
			setSaving(false)
		}
	}

	const disabled = syncBusy || saving

	return (
		<Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<DialogContent className={dialogShellContentVariants({ size: 'lg' })}>
				<DialogHeader className={dialogShellHeaderClass}>
					<DialogTitle className={dialogShellTitleClass}>Turso 远端配置</DialogTitle>
					<DialogDescription className={dialogShellDescriptionClass}>
						配置会保存在本地 settings 表；页面刷新后只会自动回填 URL，已保存的 token 不会回显。
					</DialogDescription>
				</DialogHeader>

				<div className={`${dialogShellBodyClass} flex flex-col gap-4`}>
					<label className={formFieldStackClass}>
						<span className={formFieldLabelVariants()}>Turso URL</span>
						<Input
							autoComplete='off'
							disabled={disabled}
							onChange={(event) => onSyncUrlChange(event.currentTarget.value)}
							placeholder='libsql://your-db.turso.io'
							type='text'
							value={syncUrl}
						/>
					</label>
					<label className={formFieldStackClass}>
						<span className={formFieldLabelVariants()}>Turso Token</span>
						<Input
							autoComplete='off'
							disabled={disabled}
							onChange={(event) => onSyncTokenChange(event.currentTarget.value)}
							placeholder='输入 Turso auth token'
							type='password'
							value={syncToken}
						/>
					</label>
					<p className={formFieldHintClass}>
						需要更换 token
						时直接输入新值覆盖保存。未配置前不会自动同步；配置完成后，本地写入会先标记待同步，再由同步引擎异步执行。
					</p>
					{error ? (
						<StatusNotice
							description={error}
							role='alert'
							size='sm'
							title='保存失败'
							variant='danger'
						/>
					) : null}
				</div>

				<div className={dialogShellPanelFooterClass}>
					<div className={dialogShellFooterClass}>
						<Button disabled={disabled} onClick={onClose} type='button' variant='secondary'>
							取消
						</Button>
						<Button
							disabled={disabled || configIncomplete}
							onClick={() => void handleSave()}
							type='button'
						>
							{saving ? '保存中...' : '保存配置'}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
