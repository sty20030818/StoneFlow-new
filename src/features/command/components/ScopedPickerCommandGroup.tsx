// CommandMenu 各 scoped 模式（任务/项目/属性选择）列表面板。

import { CircleIcon, FolderIcon } from 'lucide-react'

import { CommandGroup, CommandItem } from '@/shared/components/base/command'
import type { ShortcutMenuItem } from '@/shared/components/shortcut-menu'
import { ShortcutDigitSelectLayer } from '@/shared/components/shortcut-menu'
import {
	createDueDateActionSpec,
	createPriorityActionSpec,
	createStatusActionSpec,
	getTaskPlacementTargetValue,
	normalizeMetadataDateValue,
} from '@/features/metadata-fields'
import { useGlobalSearch } from '@/features/global-search'
import type { CustomDateDialogState } from '@/features/shell-dialogs'
import type { PageFilterApplyInput, PageFilterKind } from '@/features/filter'
import type { CommandContext, TaskPlacementTarget } from '@/features/command/core'
import type {
	SearchProjectItem,
	SearchTaskItem,
	Space,
	TaskPriority,
	TaskStatus,
} from '@/shared/types'

import { FilterPickerCommandGroup } from './FilterPickerCommandGroup'
import {
	CommandRow,
	CommandRowDigitHint,
	CommandRowMeta,
	CommandRowSelectionTrailing,
	renderCommandIcon,
} from './CommandMenuListPrimitives'
import {
	buildCommandTaskPlacementGroups,
	getSelectedTaskPlacementValues,
	getSelectedTaskPrioritys,
	getSelectedTaskStatusValues,
	getSelectionIndicatorForValue,
	type CommandTaskPlacementGroup,
} from './command-menu-helpers'
import { mapMetadataActionSpecToCommandMenuGroup } from './command-menu-metadata'
import type { CommandMenuMode } from './command-menu-types'
import type { CommandMenuProject } from './CommandMenu'

export function ScopedPickerCommandGroup({
	context,
	filterKind,
	mode,
	onApplyFilter,
	onClearAllFilters,
	onOpenChange,
	onSelectFilterKind,
	onSelectProject,
	onSelectTaskPlacement,
	onSelectTask,
	onSelectTaskDate,
	onSelectTaskPriority,
	onSelectTaskStatus,
	onToggleCompletedFilter,
	onOpenCustomDateDialog,
	projectLinks,
	query,
	result,
	spaces,
}: {
	context: CommandContext
	mode: Exclude<CommandMenuMode, 'default'>
	filterKind: PageFilterKind
	onApplyFilter: (input: PageFilterApplyInput) => void
	onClearAllFilters: () => void
	onOpenChange: (open: boolean) => void
	onSelectFilterKind: (kind: PageFilterKind) => void
	onSelectProject: (project: SearchProjectItem) => void
	onSelectTaskPlacement: (target: TaskPlacementTarget) => void
	onSelectTask: (task: SearchTaskItem) => void
	onSelectTaskDate: (dueAt: string | null) => void
	onSelectTaskPriority: (priority: TaskPriority) => void
	onSelectTaskStatus: (status: TaskStatus) => void
	onToggleCompletedFilter: () => void
	onOpenCustomDateDialog: (state: CustomDateDialogState) => void
	projectLinks: CommandMenuProject[]
	query: string
	result: ReturnType<typeof useGlobalSearch>['result']
	spaces: Space[]
}) {
	if (mode === 'filter-picker') {
		return (
			<FilterPickerCommandGroup
				context={context}
				filterKind={filterKind}
				onApplyFilter={onApplyFilter}
				onClearAllFilters={onClearAllFilters}
				onOpenChange={onOpenChange}
				onSelectFilterKind={onSelectFilterKind}
				onToggleCompletedFilter={onToggleCompletedFilter}
				projects={projectLinks}
				query={query}
			/>
		)
	}

	if (mode === 'task-priority-picker') {
		const group = mapMetadataActionSpecToCommandMenuGroup(createPriorityActionSpec())
		const options = group.options
		const selectedPriorityValues = getSelectedTaskPrioritys(context)
		const shortcutItems: ShortcutMenuItem<TaskPriority>[] = options.map((option) => ({
			label: option.label,
			value: option.value,
			disabled: false,
			isEmptyValue: option.value === 0,
		}))
		return (
			<CommandGroup className='pt-2' heading={group.heading}>
				<ShortcutDigitSelectLayer
					items={shortcutItems}
					onSelect={(item) => {
						onOpenChange(false)
						onSelectTaskPriority(item.value)
					}}
				/>
				{options.map((option) => (
					<CommandItem
						key={option.value}
						onSelect={() => {
							onOpenChange(false)
							onSelectTaskPriority(option.value)
						}}
						value={`priority ${option.label} ${option.value}`}
					>
						<CommandRow
							leading={option.leading}
							title={option.label}
							trailing={
								<CommandRowSelectionTrailing
									digit={option.digit}
									indicator={getSelectionIndicatorForValue(
										selectedPriorityValues,
										String(option.value),
									)}
								/>
							}
						/>
					</CommandItem>
				))}
			</CommandGroup>
		)
	}

	if (mode === 'task-status-picker') {
		const group = mapMetadataActionSpecToCommandMenuGroup(createStatusActionSpec())
		const options = group.options
		const selectedStatusValues = getSelectedTaskStatusValues(context)
		const shortcutItems: ShortcutMenuItem<TaskStatus>[] = options.map((option) => ({
			label: option.label,
			value: option.value,
			disabled: false,
		}))
		return (
			<CommandGroup className='pt-2' heading={group.heading}>
				<ShortcutDigitSelectLayer
					items={shortcutItems}
					onSelect={(item) => {
						onOpenChange(false)
						onSelectTaskStatus(item.value)
					}}
				/>
				{options.map((option) => (
					<CommandItem
						key={option.value}
						onSelect={() => {
							onOpenChange(false)
							onSelectTaskStatus(option.value)
						}}
						value={`status ${option.label} ${option.value}`}
					>
						<CommandRow
							leading={option.leading}
							title={option.label}
							trailing={
								<CommandRowSelectionTrailing
									digit={option.digit}
									indicator={getSelectionIndicatorForValue(selectedStatusValues, option.value)}
								/>
							}
						/>
					</CommandItem>
				))}
			</CommandGroup>
		)
	}

	if (mode === 'task-date-picker') {
		const group = mapMetadataActionSpecToCommandMenuGroup(
			createDueDateActionSpec({
				showClearOption: context.selection.entities.some(
					(entity) => entity.type === 'task' && entity.dueAt !== undefined && entity.dueAt !== null,
				),
			}),
		)
		const options = group.options
		const normalizedDueDates = context.selection.entities
			.filter((entity) => entity.type === 'task')
			.map((entity) => normalizeMetadataDateValue(entity.dueAt))
		const uniqueNonEmptyDueDates = Array.from(
			new Set(normalizedDueDates.filter((value): value is string => Boolean(value))),
		)
		const customDateDialogValue =
			uniqueNonEmptyDueDates.length === 1 ? uniqueNonEmptyDueDates[0] : null
		return (
			<CommandGroup className='pt-2' heading={group.heading}>
				{options.map((option) => (
					<CommandItem
						disabled={option.disabled}
						key={option.key}
						onSelect={() => {
							if (option.disabled) {
								return
							}
							if (option.action === 'openCustomDateDialog') {
								onOpenChange(false)
								onOpenCustomDateDialog({
									fieldKey: 'dueDate',
									label: '截止时间',
									value: customDateDialogValue,
									hasExistingValue: uniqueNonEmptyDueDates.length > 0,
									onSubmit: (nextValue: string | null) => onSelectTaskDate(nextValue),
								})
								return
							}
							onOpenChange(false)
							onSelectTaskDate(option.value)
						}}
						value={`date ${option.label} ${option.key}`}
					>
						<CommandRow
							leading={option.leading}
							title={option.label}
							trailing={
								option.disabled && option.disabledReason ? (
									<CommandRowMeta>{option.disabledReason}</CommandRowMeta>
								) : option.digit ? (
									<CommandRowDigitHint digit={option.digit} />
								) : option.value ? (
									<CommandRowMeta>{option.value}</CommandRowMeta>
								) : null
							}
						/>
					</CommandItem>
				))}
			</CommandGroup>
		)
	}

	if (mode === 'task-picker') {
		const tasks = [...result.tasks, ...result.completedTasks]
		return (
			<CommandGroup className='pt-2' heading='任务'>
				{tasks.map((task) => (
					<CommandItem
						key={task.id}
						onSelect={() => {
							onOpenChange(false)
							onSelectTask(task)
						}}
						value={`${task.title} ${task.note ?? ''} ${task.projectName ?? ''} ${task.spaceName}`}
					>
						<CommandRow
							leading={renderCommandIcon(CircleIcon)}
							title={task.title}
							trailing={
								<CommandRowMeta>
									{task.projectName ?? (task.inboxAt ? 'Task · Inbox' : 'Task · 独立事项')}
								</CommandRowMeta>
							}
						/>
					</CommandItem>
				))}
			</CommandGroup>
		)
	}

	if (mode === 'task-placement-picker') {
		const fallbackProjects = projectLinks.map<SearchProjectItem>((project) => ({
			id: project.id,
			spaceId: project.spaceId ?? '',
			spaceName: project.spaceName ?? project.spaceId ?? '',
			spaceSlug: '',
			name: project.label,
			note: null,
			updatedAt: '',
			completedAt: project.completedAt ?? null,
		}))
		const groups: CommandTaskPlacementGroup[] = buildCommandTaskPlacementGroups({
			context,
			projects:
				result.projects.length > 0 || result.completedProjects.length > 0
					? result.projects
					: fallbackProjects,
			spaces,
		})
		const shortcutItems: ShortcutMenuItem<TaskPlacementTarget>[] = groups.flatMap((group) =>
			group.items.map((item) => ({
				label: item.title,
				value: item.target,
				disabled: false,
				isEmptyValue: item.target.kind !== 'project',
			})),
		)
		const selectedPlacementValues = getSelectedTaskPlacementValues(context)

		return (
			<>
				<ShortcutDigitSelectLayer
					items={shortcutItems}
					onSelect={(item) => {
						onOpenChange(false)
						onSelectTaskPlacement(item.value)
					}}
				/>
				{groups.map((group) => (
					<CommandGroup
						className='pt-1 first:pt-0'
						heading={group.spaceId === 'ungrouped' ? '移动到项目...' : group.heading}
						key={group.spaceId}
					>
						{group.items.map((item: CommandTaskPlacementGroup['items'][number]) => (
							<CommandItem
								key={item.key}
								onSelect={() => {
									onOpenChange(false)
									onSelectTaskPlacement(item.target)
								}}
								value={item.value}
							>
								<CommandRow
									leading={item.leading}
									title={item.title}
									trailing={
										<CommandRowSelectionTrailing
											digit={item.digit}
											indicator={getSelectionIndicatorForValue(
												selectedPlacementValues,
												getTaskPlacementTargetValue(item.target),
											)}
										/>
									}
								/>
							</CommandItem>
						))}
					</CommandGroup>
				))}
			</>
		)
	}

	const projects = [...result.projects, ...result.completedProjects]
	return (
		<CommandGroup className='pt-2' heading='项目'>
			{projects.map((project) => (
				<CommandItem
					key={project.id}
					onSelect={() => {
						onOpenChange(false)
						onSelectProject(project)
					}}
					value={`${project.name} ${project.note ?? ''} ${project.spaceName}`}
				>
					<CommandRow
						leading={renderCommandIcon(FolderIcon)}
						title={project.name}
						trailing={<CommandRowMeta>{`Project · ${project.spaceName}`}</CommandRowMeta>}
					/>
				</CommandItem>
			))}
		</CommandGroup>
	)
}
