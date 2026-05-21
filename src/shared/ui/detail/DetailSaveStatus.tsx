import type { ComponentPropsWithoutRef } from 'react'

import type { AutosaveStatus } from '@/shared/autosave'
import { cn } from '@/shared/lib/utils'

import { detailSaveStatusClass, detailSaveStatusErrorClass } from './detailTokens'

type DetailSaveStatusProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
	status: AutosaveStatus
	error?: string | null
	savedAt?: number | null
}

const SAVE_STATUS_LABELS: Partial<Record<AutosaveStatus, string>> = {
	dirty: '已编辑',
	scheduled: '保存中...',
	saving: '保存中...',
	saved: '已保存',
	failed: '保存失败',
}

export function DetailSaveStatus({
	status,
	error,
	savedAt: _savedAt,
	className,
	...props
}: DetailSaveStatusProps) {
	const label = SAVE_STATUS_LABELS[status]

	if (!label) {
		return null
	}

	const isError = status === 'failed'

	return (
		<div
			className={cn(isError ? detailSaveStatusErrorClass : detailSaveStatusClass, className)}
			data-detail-save-status={status}
			{...props}
		>
			<span>{label}</span>
			{isError && error ? <span className='ml-1'>{error}</span> : null}
		</div>
	)
}
