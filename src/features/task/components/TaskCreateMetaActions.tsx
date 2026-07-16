import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
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
 * 状态元数据下拉 — outline button + DropdownMenu。
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
			disabled={disabled}
			fieldKey='status'
			headerShortcut={statusDropdownProps.headerShortcut}
			label='状态'
			menuLabel={statusDropdownProps.menuLabel}
			options={statusDropdownProps.options}
			value={status}
			onChange={onStatusChange}
		/>
	)
}

/**
 * 优先级元数据下拉 — outline button + DropdownMenu。
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
			disabled={disabled}
			fieldKey='priority'
			headerShortcut={priorityDropdownProps.headerShortcut}
			label='优先级'
			menuLabel={priorityDropdownProps.menuLabel}
			options={priorityDropdownProps.options}
			value={priority}
			onChange={onPriorityChange}
		/>
	)
}

/**
 * 归属元数据下拉 — grouped local placement。
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
	onPlacementChange: (placement: TaskPlacement, projectId: string | null) => void
}) {
	const groupedDropdownProps = createTaskPlacementGroupedDropdownProps({
		mode: 'local',
		currentSpaceId: spaceId,
		spaces,
		projects,
	})
	const value = toTaskPlacementTarget(placement, spaceId, projectId)
	const needsProjectSelection = placement === 'project' && !projectId

	return (
		<MetadataPlacementDropdown
			buttonIcon={needsProjectSelection ? <FolderIcon className='size-3.5' /> : undefined}
			buttonLabel={needsProjectSelection ? '选择项目' : undefined}
			disabled={disabled}
			groups={groupedDropdownProps.groups}
			headerShortcut={groupedDropdownProps.headerShortcut}
			label='归属'
			menuLabel={groupedDropdownProps.menuLabel}
			value={value}
			onChange={(nextValue: TaskPlacementTarget) => {
				const nextPlacement = fromTaskPlacementTarget(nextValue)
				onPlacementChange(nextPlacement.placement, nextPlacement.projectId)
			}}
		/>
	)
}

function toTaskPlacementTarget(
	placement: TaskPlacement,
	spaceId: string,
	projectId: string,
): TaskPlacementTarget {
	if (placement === 'project' && projectId) {
		return { kind: 'project', projectId, spaceId }
	}

	if (placement === 'noProject') {
		return { kind: 'no_project', spaceId }
	}

	return { kind: 'inbox', spaceId }
}

function fromTaskPlacementTarget(value: TaskPlacementTarget): {
	placement: TaskPlacement
	projectId: string | null
} {
	if (value.kind === 'project') {
		return {
			placement: 'project',
			projectId: value.projectId,
		}
	}

	return {
		placement: value.kind === 'no_project' ? 'noProject' : 'inbox',
		projectId: null,
	}
}
