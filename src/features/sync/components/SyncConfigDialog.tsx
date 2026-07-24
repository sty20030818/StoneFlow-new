import { useEffect, useState } from 'react'

import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'
import { cn } from '@/shared/lib/utils'
import { StatusNotice } from '@/shared/components/StatusNotice'
import { Button } from '@/shared/components/base/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/shared/components/base/dialog'
import { Textarea } from '@/shared/components/base/textarea'
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
	databaseUrl: string
	/** 仅表示「正在保存本弹窗」，不要绑全局同步中（否则会误禁用） */
	saving?: boolean
	onClose: () => void
	onSave: (input: { databaseUrl: string }) => Promise<void>
	onDatabaseUrlChange: (value: string) => void
}

export function SyncConfigDialog({
	open,
	databaseUrl,
	saving: savingExternal = false,
	onClose,
	onSave,
	onDatabaseUrlChange,
}: SyncConfigDialogProps) {
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const configIncomplete = databaseUrl.trim().length === 0
	const busy = saving || savingExternal

	useEffect(() => {
		if (!open) {
			setSaving(false)
			setError(null)
		}
	}, [open])

	async function handleSave() {
		if (busy || configIncomplete) {
			return
		}
		setSaving(true)
		setError(null)
		try {
			await onSave({
				databaseUrl: databaseUrl.trim(),
			})
			// 保存成功立刻关窗，不把后续状态刷新绑在弹窗上
			onClose()
		} catch (saveError) {
			setError(normalizeTauriError(saveError, '同步配置保存失败'))
		} finally {
			setSaving(false)
		}
	}

	return (
		<Dialog onOpenChange={(nextOpen) => !nextOpen && !busy && onClose()} open={open}>
			<DialogContent
				className={cn(dialogShellContentVariants({ size: 'lg' }), 'min-w-0 overflow-hidden')}
			>
				<DialogHeader className={dialogShellHeaderClass}>
					<DialogTitle className={dialogShellTitleClass}>配置云端副本</DialogTitle>
					<DialogDescription className={dialogShellDescriptionClass}>
						粘贴 Neon 或自建 Postgres
						连接串。保存只写本机配置，不会立刻连库；连通性请用「立即同步」或诊断验证。
					</DialogDescription>
				</DialogHeader>

				<div className={`${dialogShellBodyClass} flex min-w-0 flex-col gap-4`}>
					<label className={`${formFieldStackClass} min-w-0`}>
						<span className={formFieldLabelVariants()}>同步数据库连接</span>
						{/* 连接串无空格超长：禁止 field-sizing 横向撑破弹窗，强制断行。 */}
						<Textarea
							autoComplete='off'
							className='min-h-24 max-w-full resize-y overflow-x-hidden break-all font-mono text-[13px] leading-5 field-sizing-fixed'
							disabled={busy}
							onChange={(event) => onDatabaseUrlChange(event.currentTarget.value)}
							placeholder={
								'postgresql://user:password@host:5432/dbname\n# 或带 sslmode：\n# postgresql://user:pass@host/db?sslmode=require'
							}
							spellCheck={false}
							value={databaseUrl}
						/>
					</label>
					<p className={formFieldHintClass}>
						完整连接串保存在系统钥匙串；界面只展示脱敏地址。更换时粘贴新串覆盖即可。
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
						<Button disabled={busy} onClick={onClose} type='button' variant='secondary'>
							取消
						</Button>
						<Button
							disabled={busy || configIncomplete}
							onClick={() => void handleSave()}
							type='button'
						>
							{busy ? '保存中...' : '保存配置'}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
