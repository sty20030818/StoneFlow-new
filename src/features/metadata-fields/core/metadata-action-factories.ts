import {
	TASK_PRIORITY_OPTIONS,
	type TaskPriorityValue,
} from '@/features/task/model/taskPriority'
import { TASK_STATUS_OPTIONS } from '@/features/task/model/taskStatus'
import type { TaskStatus } from '@/shared/types'

import {
	createMetadataDateOptionsConfig,
	normalizeMetadataDateValue,
} from './metadata-date-options'
import type { MetadataActionSpec } from './metadata-action-spec'
import type { MetadataPlacementValue } from './metadata-field.types'

export function createStatusActionSpec(): MetadataActionSpec<TaskStatus> {
	return {
		fieldKey: 'status',
		headerLabel: '设置状态为...',
		headerShortcut: 'S',
		commandPlaceholder: '选择状态…',
		options: TASK_STATUS_OPTIONS.map((option, index) => ({
			key: option.value,
			value: option.value,
			label: option.label,
			iconKey: `status-${option.value}`,
			digit: String(index + 1),
		})),
	}
}

export function createPriorityActionSpec(): MetadataActionSpec<TaskPriorityValue> {
	return {
		fieldKey: 'priority',
		headerLabel: '设置优先级为...',
		headerShortcut: 'P',
		commandPlaceholder: '选择优先级…',
		options: TASK_PRIORITY_OPTIONS.map((option, index) => ({
			key: String(option.value),
			value: option.value,
			label: option.label,
			iconKey: `priority-${option.value}` as const,
			digit: String(index),
			isEmptyValue: option.value === 0,
		})),
	}
}

export function createDueDateActionSpec({
	currentValue,
	showClearOption,
}: {
	currentValue?: string | null
	showClearOption: boolean
}): MetadataActionSpec<string | null> {
	return {
		fieldKey: 'dueDate',
		headerLabel: '设置截止时间为...',
		headerShortcut: 'D',
		commandPlaceholder: '选择截止时间…',
		options: createMetadataDateOptionsConfig({
			currentValue,
			showClearOption,
		}).map((option) => ({
			key: option.key,
			value: normalizeMetadataDateValue(option.value),
			label: option.label,
			iconKey: getDueDateIconKey(option.key),
			meta: option.meta,
			disabled: option.disabled,
			disabledReason: typeof option.trailing === 'string' ? option.trailing : undefined,
			digit: option.isEmptyValue ? '0' : undefined,
			isEmptyValue: option.isEmptyValue,
			action: option.key === 'custom' ? 'openCustomDateDialog' : 'select',
		})),
	}
}

export function createPlacementActionSpec({
	projects,
	includeInbox = false,
	labelMode = 'project',
}: {
	projects: Array<{ id: string; name: string }>
	includeInbox?: boolean
	labelMode?: 'project' | 'parentProject'
}): MetadataActionSpec<MetadataPlacementValue> {
	const options = [
		...(includeInbox
			? [
					{
						key: 'inbox',
						value: { kind: 'inbox' as const },
						label: '收件箱',
						iconKey: 'inbox' as const,
					},
				]
			: []),
		{
			key: 'noProject',
			value: { kind: 'noProject' as const },
			label: labelMode === 'parentProject' ? '无父项目' : '独立事项',
			iconKey: 'target' as const,
			digit: '0',
			isEmptyValue: true,
		},
		...projects.map((project) => ({
			key: `project:${project.id}`,
			value: { kind: 'project' as const, projectId: project.id },
			label: project.name,
			iconKey: 'folder' as const,
		})),
	]

	return {
		fieldKey: labelMode === 'parentProject' ? 'parentProject' : 'project',
		headerLabel: labelMode === 'parentProject' ? '设置父项目为...' : '移动到项目...',
		headerShortcut: labelMode === 'parentProject' ? undefined : '⇧ P',
		commandPlaceholder: labelMode === 'parentProject' ? '选择父项目…' : '选择项目…',
		options,
	}
}

export function createSpaceActionSpec({
	spaces,
}: {
	spaces: Array<{ id: string; name: string }>
}): MetadataActionSpec<string> {
	return {
		fieldKey: 'space',
		headerLabel: '设置空间为...',
		commandPlaceholder: '选择空间…',
		options: spaces.map((space) => ({
			key: `space:${space.id}`,
			value: space.id,
			label: space.name,
			iconKey: 'space',
		})),
	}
}

function getDueDateIconKey(
	key: 'none' | 'today' | 'tomorrow' | 'this-week' | 'one-week' | 'custom',
) {
	switch (key) {
		case 'none':
			return 'calendar-off' as const
		case 'today':
			return 'calendar-1' as const
		case 'this-week':
		case 'one-week':
			return 'calendar-days' as const
		case 'custom':
			return 'calendar-cog' as const
		default:
			return 'calendar' as const
	}
}
