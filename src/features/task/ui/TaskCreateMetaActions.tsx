import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import type { TaskPlacement } from '@/shared/types'
import type { TaskStatus } from '@/shared/types'
import type { ProjectOption } from '@/features/project/model/types'
import {
	createTaskPlacementMetadataDropdownProps,
	createTaskPlacementMetadataOptions,
	createTaskPriorityMetadataDropdownProps,
	createTaskStatusMetadataDropdownProps,
	MetadataFieldDropdown,
	MetadataPlacementDropdown,
	type MetadataPlacementValue,
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
 * 项目元数据下拉 — outline button + DropdownMenu。
 */
export function ProjectMetaAction({
	disabled,
	placement,
	projectId,
	projects,
	onPlacementChange,
}: {
	disabled: boolean
	placement: TaskPlacement
	projectId: string
	projects: ProjectOption[]
	onPlacementChange: (placement: TaskPlacement, projectId: string | null) => void
}) {
	const placementOptions = createTaskPlacementMetadataOptions({
		projects,
		includeInbox: true,
	})
	const placementDropdownProps = createTaskPlacementMetadataDropdownProps({
		projects,
		includeInbox: true,
	})
	const value = toMetadataPlacementValue(placement, projectId)
	const needsProjectSelection = placement === 'project' && !projectId

	return (
		<MetadataPlacementDropdown
			buttonIcon={needsProjectSelection ? <FolderIcon className='size-3.5' /> : undefined}
			buttonLabel={needsProjectSelection ? '选择项目' : undefined}
			disabled={disabled}
			headerShortcut={placementDropdownProps.headerShortcut}
			label='项目'
			menuLabel={placementDropdownProps.menuLabel}
			options={placementOptions}
			value={value}
			onChange={(nextValue) => {
				const nextPlacement = fromMetadataPlacementValue(nextValue)
				onPlacementChange(nextPlacement.placement, nextPlacement.projectId)
			}}
		/>
	)
}

function toMetadataPlacementValue(
	placement: TaskPlacement,
	projectId: string,
): MetadataPlacementValue {
	if (placement === 'project' && projectId) {
		return { kind: 'project', projectId }
	}

	if (placement === 'noProject') {
		return { kind: 'noProject' }
	}

	return { kind: 'inbox' }
}

function fromMetadataPlacementValue(value: MetadataPlacementValue): {
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
		placement: value.kind === 'noProject' ? 'noProject' : 'inbox',
		projectId: null,
	}
}
