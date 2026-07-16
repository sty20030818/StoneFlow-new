import { BellIcon, CalendarIcon, Clock3Icon } from 'lucide-react'

import { useQuickCreate } from '@/features/quick-create/domain/QuickCreateDomainProvider'
import type { QuickCreatePopoverKey } from '@/features/quick-create/model/types'
import { DateControl } from '@/features/quick-create/components/controls/DateControl'
import { StatusControl } from '@/features/quick-create/components/controls/StatusControl'
import { quickCreateAdvancedRowClass } from '@/shared/components/patterns/quick-create'

export function QuickCreateAdvancedMetaBar() {
	const { actions, state } = useQuickCreate()

	if (!state.isAdvancedOpen) {
		return null
	}

	return (
		<div className={quickCreateAdvancedRowClass} data-testid='quick-create-advanced-meta-bar'>
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

function handleDatePopoverChange(setPopover: (key: QuickCreatePopoverKey | null) => void) {
	return (open: boolean, key: QuickCreatePopoverKey) => {
		setPopover(open ? key : null)
	}
}
