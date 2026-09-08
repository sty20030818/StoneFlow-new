import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { targetFromPlacementDraft } from '@/features/task/model/taskPlacement'
import type { TaskPlacement } from '@/shared/types'
import type { TaskStatus } from '@/shared/types'
import type { ProjectOption } from '@/features/project'
import {
	createTaskPlacementGroupedDropdownProps,
	createTaskPriorityMetadataDropdownProps,
	createTaskStatusMetadataDropdownProps,
	MetadataFieldDropdown,
	MetadataPlacementDropdown,
	type TaskPlacementTarget,
} from '@/features/metadata-fields'
import { FolderIcon } from 'lucide-react'

/**
 * 状态元数据下拉入口 + DropdownMenu。
 */
export function StatusMetaAction({
	status,
	disabled,
	onStatusChange,
}: {
	status: TaskStatus
	disabled: boolean
	onStatusChange: (status: TaskStatus) => void
}) {
	const statusDropdownProps = createTaskStatusMetadataDropdownProps()

	return (
		<MetadataFieldDropdown
			buttonAppearance='outline'
			disabled={disabled}
			fieldKey='status'
			label='状态'
			menuLabel={statusDropdownProps.menuLabel}
			options={statusDropdownProps.options}
			value={status}
			onChange={onStatusChange}
		/>
	)
}

/**
 * 优先级元数据下拉入口 + DropdownMenu。
 */
export function PriorityMetaAction({
	priority,
	disabled,
	onPriorityChange,
}: {
	priority: TaskPriorityValue
	disabled: boolean
	onPriorityChange: (priority: TaskPriorityValue) => void
}) {
	const priorityDropdownProps = createTaskPriorityMetadataDropdownProps()

	return (
		<MetadataFieldDropdown
			buttonAppearance='outline'
			disabled={disabled}
			fieldKey='priority'
			label='优先级'
			menuLabel={priorityDropdownProps.menuLabel}
			options={priorityDropdownProps.options}
			value={priority}
			onChange={onPriorityChange}
		/>
	)
}

/**
 * 创建归属下拉允许跨 Space 选择，完整目标交给表单统一更新。
 */
export function PlacementMetaAction({
	disabled,
	placement,
	spaceId,
	projectId,
	spaces,
	projects,
	onPlacementChange,
}: {
	disabled: boolean
	placement: TaskPlacement
	spaceId: string
	projectId: string
	spaces: Array<{ id: string; name: string }>
	projects: ProjectOption[]
	onPlacementChange: (target: TaskPlacementTarget) => void
}) {
	const groupedDropdownProps = createTaskPlacementGroupedDropdownProps({
		mode: 'global',
		currentSpaceId: spaceId,
		spaces,
		projects,
	})
	const value = targetFromPlacementDraft(placement, spaceId, projectId)
	const needsProjectSelection = placement === 'project' && !projectId

	return (
		<MetadataPlacementDropdown
			buttonAppearance='outline'
			buttonIcon={needsProjectSelection ? <FolderIcon className='size-3.5' /> : undefined}
			buttonLabel={needsProjectSelection ? '选择项目' : undefined}
			disabled={disabled}
			disabledReason='项目列表加载中，暂时无法选择归属'
			groups={groupedDropdownProps.groups}
			label='归属'
			menuLabel={groupedDropdownProps.menuLabel}
			value={value}
			onChange={onPlacementChange}
		/>
	)
}
