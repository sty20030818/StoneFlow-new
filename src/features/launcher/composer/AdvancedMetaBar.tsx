import { BellIcon, CalendarIcon, Clock3Icon } from 'lucide-react'

import { useLauncher } from '../domain/LauncherDomainProvider'
import type { LauncherPopoverKey } from '../model/types'
import { DateControl } from './controls/DateControl'
import { StatusControl } from './controls/StatusControl'
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
				field='plannedAt'
				icon={<Clock3Icon className='size-3.5' />}
				label='计划时间'
				onDateChange={actions.setDate}
				onOpenChange={handleDatePopoverChange(actions.setPopover)}
				open={state.activePopover === 'scheduled'}
				popoverKey='scheduled'
				value={state.draft.plannedAt}
			/>
			<DateControl
				field='remindAt'
				icon={<BellIcon className='size-3.5' />}
				label='提醒时间'
				onDateChange={actions.setDate}
				onOpenChange={handleDatePopoverChange(actions.setPopover)}
				open={state.activePopover === 'reminder'}
				popoverKey='reminder'
				value={state.draft.remindAt}
			/>
		</div>
	)
}

function handleDatePopoverChange(setPopover: (key: LauncherPopoverKey | null) => void) {
	return (open: boolean, key: LauncherPopoverKey) => {
		setPopover(open ? key : null)
	}
}
