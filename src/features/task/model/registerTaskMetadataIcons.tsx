import { setMetadataDomainIconRenderer } from '@/features/metadata-fields/presentation'
import type { TaskStatus } from '@/shared/types'

import { PriorityIcon } from './indicators/PriorityIcon'
import { TaskStatusIndicator } from './indicators/TaskStatusIndicator'
import type { TaskPriorityValue } from './taskPriority'

/** 在壳装配根调用一次：把 status/priority 图标注入 metadata，避免 meta 硬依赖 task 图标。 */
export function registerTaskMetadataIcons() {
	setMetadataDomainIconRenderer((iconKey) => {
		if (iconKey.startsWith('status-')) {
			return <TaskStatusIndicator status={iconKey.replace('status-', '') as TaskStatus} />
		}
		if (iconKey.startsWith('priority-')) {
			return (
				<PriorityIcon
					priority={Number(iconKey.replace('priority-', '')) as TaskPriorityValue}
					size='md'
				/>
			)
		}
		return null
	})
}
