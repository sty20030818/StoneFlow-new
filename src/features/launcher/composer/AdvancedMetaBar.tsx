import { BellIcon, CalendarIcon, Clock3Icon } from 'lucide-react'

import { useLauncher } from '@/features/launcher/domain/LauncherDomainProvider'
import type { LauncherPopoverKey } from '@/features/launcher/model/types'
import { DateControl } from '@/features/launcher/composer/controls/DateControl'
import { StatusControl } from '@/features/launcher/composer/controls/StatusControl'
import { launcherAdvancedRowClass } from '@/shared/components/patterns/launcher'

/**
 * Advanced 字段行；显隐由壳内折叠槽控制，本组件始终渲染内容以便动画收合。
 */
export function AdvancedMetaBar() {
	const { actions, state } = useLauncher()

	return (
		<div className={launcherAdvancedRowClass} data-testid='launcher-advanced-meta-bar'>
			<StatusControl
				onOpenChange={(open) => actions.setPopover(open ? 'status' : null)}
				onStatusChange={actions.setStatus}
				open={state.activePopover === 'status'}
				status={state.draft.status}
			/>

			<DateControl
				field='dueAt'
				icon={<CalendarIcon className='size-3.5' />}
				label='截止时间'
				onDateChange={actions.setDate}
				onOpenChange={handleDatePopoverChange(actions.setPopover)}
				open={state.activePopover === 'due'}
				popoverKey='due'
				value={state.draft.dueAt}
			/>
			<DateControl
				field='scheduledAt'
				icon={<Clock3Icon className='size-3.5' />}
				label='计划时间'
				onDateChange={actions.setDate}
				onOpenChange={handleDatePopoverChange(actions.setPopover)}
				open={state.activePopover === 'scheduled'}
				popoverKey='scheduled'
				value={state.draft.scheduledAt}
			/>
			<DateControl
				field='reminderAt'
				icon={<BellIcon className='size-3.5' />}
				label='提醒时间'
				onDateChange={actions.setDate}
				onOpenChange={handleDatePopoverChange(actions.setPopover)}
				open={state.activePopover === 'reminder'}
				popoverKey='reminder'
				value={state.draft.reminderAt}
			/>
		</div>
	)
}

function handleDatePopoverChange(setPopover: (key: LauncherPopoverKey | null) => void) {
	return (open: boolean, key: LauncherPopoverKey) => {
		setPopover(open ? key : null)
	}
}
