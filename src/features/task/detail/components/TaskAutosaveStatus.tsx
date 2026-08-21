import { Chip } from '@heroui/react'

import type { AutosaveStatus } from '@/shared/autosave'

const SAVE_STATUS_LABELS: Partial<Record<AutosaveStatus, string>> = {
	dirty: '已编辑',
	scheduled: '保存中…',
	saving: '保存中…',
	saved: '已保存',
	failed: '保存失败',
}

type TaskAutosaveStatusProps = {
	status: AutosaveStatus
	error?: string | null
}

/** 任务详情在抽屉与完整页共享的低噪自动保存反馈。 */
export function TaskAutosaveStatus({ status, error }: TaskAutosaveStatusProps) {
	const label = SAVE_STATUS_LABELS[status]
	if (!label) return null

	const failed = status === 'failed'
	return (
		<div aria-live='polite' className='min-w-0' role='status'>
			<Chip
				className='min-w-0 max-w-64 shrink'
				color={failed ? 'danger' : 'default'}
				size='sm'
				variant={failed ? 'soft' : 'tertiary'}
			>
				<Chip.Label className='min-w-0 truncate'>
					<span>{label}</span>
					{failed && error ? (
						<>
							<span aria-hidden='true'> · </span>
							<span>{error}</span>
						</>
					) : null}
				</Chip.Label>
			</Chip>
		</div>
	)
}
