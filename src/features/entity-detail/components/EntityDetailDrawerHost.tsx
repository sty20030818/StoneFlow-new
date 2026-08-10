import { TaskDrawer } from '@/features/task'

import type { EntityDetailRouteState } from '../model/entityDetailTypes'

type EntityDetailDrawerHostProps = {
	activeDetail: EntityDetailRouteState
	open: boolean
	onClose: () => void
}

export function EntityDetailDrawerHost({
	activeDetail,
	open,
	onClose,
}: EntityDetailDrawerHostProps) {
	if (!open || !activeDetail) {
		return null
	}

	return <TaskDrawer onClose={onClose} taskId={activeDetail.id} />
}
