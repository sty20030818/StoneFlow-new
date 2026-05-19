import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'

import {
	ArrowRightIcon,
	CheckCircle2Icon,
	CircleIcon,
	CompassIcon,
	CommandIcon,
	FolderIcon,
	FolderOpenIcon,
	FolderPlusIcon,
	FoldersIcon,
	LayoutGridIcon,
	ListTodoIcon,
	PanelLeftIcon,
	PlusIcon,
	SearchIcon,
	SquarePlusIcon,
	Trash2Icon,
	type LucideProps,
} from 'lucide-react'

import { OverlayScrollbar } from '@/shared/ui/OverlayScrollbar'
import { Badge } from '@/shared/ui/base/badge'
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/shared/ui/base/command'
import { getProjectStatusBadgeVariant } from '@/shared/ui/badgeSemantics'
import { useGlobalSearch } from '@/features/global-search/model/useGlobalSearch'
import type {
	PageDateFilterValue,
	PageFilterApplyInput,
	PageFilterKind,
} from '@/features/filter/model'
import type {
	CommandContext,
	CommandId,
	CommandRuntime,
	CommandSelectedEntity,
	TaskPlacementTarget,
} from '@/features/command/core'
import type { SearchProjectItem, SearchTaskItem, Space, TaskStatus } from '@/shared/types'
import { TASK_PRIORITY_OPTIONS, type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TASK_STATUS_OPTIONS } from '@/features/task/model/taskStatus'

import { ShortcutTokens } from './ShortcutTokens'
import { buildCommandMenuGroups, type CommandMenuEntry } from './command-menu-model'
import {
	isCommandMenuSearchMode,
	isCommandMenuTaskPropertyMode,
	type CommandMenuMode,
} from './command-menu-types'

export type { CommandMenuMode } from './command-menu-types'

export type CommandMenuProject = {
	id: string
	label: string
	badge?: string
	spaceId?: string
	spaceName?: string
	completedAt?: string | null
}

type CommandMenuProps = {
	className?: string
	context: CommandContext
	description: string
	filterKind: PageFilterKind
	mode: CommandMenuMode
	onApplyFilter: (input: PageFilterApplyInput) => void
	onClearAllFilters: () => void
	onNavigateProject: (projectId: string) => void
	onOpenChange: (open: boolean) => void
	onSelectFilterKind: (kind: PageFilterKind) => void
	onSelectProject: (project: SearchProjectItem) => void
	onSelectTaskPlacement: (target: TaskPlacementTarget) => void
	onSelectTask: (task: SearchTaskItem) => void
	onSelectTaskDate: (dueAt: string | null) => void
	onSelectTaskPriority: (priority: TaskPriorityValue) => void
	onSelectTaskStatus: (status: TaskStatus) => void
	onToggleCompletedFilter: () => void
	onRunCommand: (id: CommandId) => void
	open: boolean
	projects: CommandMenuProject[]
	runtime: CommandRuntime
	spaces?: Space[]
	title: string
}

export function CommandMenu({
	className,
	context,
	description,
	filterKind,
	mode,
	onApplyFilter,
	onClearAllFilters,
	onNavigateProject,
	onOpenChange,
	onSelectFilterKind,
	onSelectProject,
	onSelectTaskPlacement,
	onSelectTask,
	onSelectTaskDate,
	onSelectTaskPriority,
	onSelectTaskStatus,
	onToggleCompletedFilter,
	onRunCommand,
	open,
	projects: projectLinks,
	runtime,
	spaces = [],
	title,
}: CommandMenuProps) {
	const [query, setQuery] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)
	const groups = useMemo(() => buildCommandMenuGroups(runtime, context), [context, runtime])
	const scopedSearch = useGlobalSearch(isCommandMenuSearchMode(mode) ? query : '')
	const isScopedMode = mode !== 'default'

	useEffect(() => {
		setQuery('')
	}, [mode, open])

	useEffect(() => {
		if (!open) {
			return
		}

		requestAnimationFrame(() => {
			const input = inputRef.current
			if (!input) {
				return
			}

			if (document.activeElement !== input) {
				input.focus()
			}
			input.setSelectionRange(query.length, query.length)
		})
	}, [open, query.length])

	const handleSurfacePointerDownCapture = (event: React.PointerEvent<HTMLDivElement>) => {
		const target = event.target
		if (!(target instanceof HTMLElement)) {
			return
		}

		if (target.closest('[data-slot="command-input"]')) {
			return
		}

		requestAnimationFrame(() => {
			const input = inputRef.current
			if (!input) {
				return
			}

			if (document.activeElement !== input) {
				input.focus()
			}
			input.setSelectionRange(query.length, query.length)
		})
	}

	return (
		<CommandDialog
			className={className}
			description={description}
			onOpenChange={onOpenChange}
			open={open}
			title={title}
		>
			<Command
				onPointerDownCapture={handleSurfacePointerDownCapture}
				shouldFilter={!isCommandMenuSearchMode(mode)}
			>
				<CommandInput
					ref={inputRef}
					placeholder={getCommandMenuPlaceholder(mode, filterKind)}
					value={query}
					onValueChange={setQuery}
				/>
				<CommandMenuSelectionChips entities={context.selection.entities} />
				<CommandScrollableList>
					<CommandEmpty>{getCommandMenuEmptyText(mode, query)}</CommandEmpty>
					{isScopedMode ? (
						<ScopedPickerCommandGroup
							context={context}
							mode={mode}
							filterKind={filterKind}
							onApplyFilter={onApplyFilter}
							onClearAllFilters={onClearAllFilters}
							onOpenChange={onOpenChange}
							onSelectFilterKind={onSelectFilterKind}
							onSelectProject={onSelectProject}
							onSelectTaskPlacement={onSelectTaskPlacement}
							onSelectTask={onSelectTask}
							onSelectTaskDate={onSelectTaskDate}
							onSelectTaskPriority={onSelectTaskPriority}
							onSelectTaskStatus={onSelectTaskStatus}
							onToggleCompletedFilter={onToggleCompletedFilter}
							projectLinks={projectLinks}
							query={query}
							result={scopedSearch.result}
							spaces={spaces}
						/>
					) : (
						<>
							<CommandMenuList
								groups={groups}
								onOpenChange={onOpenChange}
								onRunCommand={onRunCommand}
							/>
							<ProjectsCommandGroup onNavigateProject={onNavigateProject} projects={projectLinks} />
						</>
					)}
				</CommandScrollableList>
			</Command>
		</CommandDialog>
	)
}

function CommandMenuSelectionChips({ entities }: { entities: CommandSelectedEntity[] }) {
	if (entities.length === 0) {
		return null
	}

	const visibleEntities = entities.slice(0, 4)
	const hiddenCount = entities.length - visibleEntities.length

	return (
		<div
			aria-label='当前选中对象'
			className='no-scrollbar flex max-h-15 flex-nowrap gap-1.5 overflow-x-auto border-b border-sf-divider px-3 py-2'
		>
			{visibleEntities.map((entity) => (
				<Badge
					className='max-w-48 justify-start rounded-full px-2.5 text-[11px]'
					key={`${entity.type}:${entity.id}`}
					title={entity.subtitle ? `${entity.title} · ${entity.subtitle}` : entity.title}
					variant='outline'
				>
					<span className='truncate'>{entity.title}</span>
					{entity.subtitle ? (
						<span className='shrink-0 text-sf-text-tertiary'>· {entity.subtitle}</span>
					) : null}
				</Badge>
			))}
			{hiddenCount > 0 ? (
				<Badge className='rounded-full px-2.5 text-[11px]' variant='secondary'>
					还有 {hiddenCount} 项
				</Badge>
			) : null}
		</div>
	)
}

function CommandScrollableList({ children }: { children: React.ReactNode }) {
	const listRef = useRef<React.ElementRef<typeof CommandList>>(null)

	return (
		<div className='relative min-h-0'>
			<CommandList className='no-scrollbar max-h-120 overflow-y-auto px-1 pb-2' ref={listRef}>
				{children}
			</CommandList>
			<OverlayScrollbar
				minThumbHeight={48}
				scrollRef={listRef}
				thumbLengthRatio={0.58}
				trackInsetBottom={8}
				trackInsetTop={4}
			/>
		</div>
	)
}

function getCommandMenuPlaceholder(mode: CommandMenuMode, filterKind: PageFilterKind) {
	switch (mode) {
		case 'task-picker':
			return '搜索任务…'
		case 'project-picker':
			return '搜索项目…'
		case 'task-placement-picker':
			return '移动到项目或独立事项...'
		case 'task-priority-picker':
			return '选择优先级…'
		case 'task-status-picker':
			return '选择状态…'
		case 'task-date-picker':
			return '选择日期…'
		case 'filter-picker':
			return getFilterPickerPlaceholder(mode, filterKind)
		default:
			return '输入命令 或 搜索 …'
	}
}

function getCommandMenuEmptyText(mode: CommandMenuMode, query: string) {
	if (mode === 'filter-picker') {
		return query.trim() ? '没有匹配的筛选项' : '没有可用筛选项'
	}

	if (isCommandMenuTaskPropertyMode(mode)) {
		return '没有可用选项'
	}

	if (!query.trim()) {
		return mode === 'task-picker'
			? '输入关键词搜索任务'
			: mode === 'project-picker' || mode === 'task-placement-picker'
				? '输入关键词搜索项目'
				: '没有可用命令'
	}

	return mode === 'task-picker'
		? '没有匹配的任务'
		: mode === 'project-picker' || mode === 'task-placement-picker'
			? '没有匹配的项目'
			: '没有匹配的命令'
}

function CommandMenuList({
	groups,
	onOpenChange,
	onRunCommand,
}: {
	groups: ReturnType<typeof buildCommandMenuGroups>
	onOpenChange: (open: boolean) => void
	onRunCommand: (id: CommandId) => void
}) {
	return (
		<>
			{groups.map((group) => (
				<CommandMenuGroup
					group={group}
					key={group.key}
					onOpenChange={onOpenChange}
					onRunCommand={onRunCommand}
				/>
			))}
		</>
	)
}

function CommandMenuGroup({
	group,
	onOpenChange,
	onRunCommand,
}: {
	group: ReturnType<typeof buildCommandMenuGroups>[number]
	onOpenChange: (open: boolean) => void
	onRunCommand: (id: CommandId) => void
}) {
	return (
		<CommandGroup className='pt-1 first:pt-0' heading={group.heading}>
			{group.entries.map((entry) => (
				<CommandMenuItem
					entry={entry}
					key={entry.command.id}
					onOpenChange={onOpenChange}
					onRunCommand={onRunCommand}
				/>
			))}
		</CommandGroup>
	)
}

function CommandMenuItem({
	entry,
	onOpenChange,
	onRunCommand,
}: {
	entry: CommandMenuEntry
	onOpenChange: (open: boolean) => void
	onRunCommand: (id: CommandId) => void
}) {
	return (
		<CommandItem
			disabled={entry.disabled}
			onSelect={() => {
				if (entry.disabled) {
					return
				}
				onOpenChange(false)
				onRunCommand(entry.command.id)
			}}
			value={`${entry.command.title} ${entry.command.keywords?.join(' ') ?? ''}`}
		>
			<CommandRow
				leadingIcon={resolveCommandIcon(entry.command.id)}
				title={entry.command.title}
				trailing={
					entry.disabled && entry.disabledReason ? (
						<CommandRowMeta>{entry.disabledReason}</CommandRowMeta>
					) : (
						<CommandMenuShortcut shortcut={entry.shortcut} />
					)
				}
			/>
		</CommandItem>
	)
}

function CommandMenuShortcut({ shortcut }: { shortcut: CommandMenuEntry['shortcut'] }) {
	if (!shortcut) {
		return null
	}

	return (
		<ShortcutTokens
			kbdClassName='h-6 min-w-6 rounded-sm border border-sf-border-subtle bg-background/90 px-1.5 text-[11px] text-sf-text-secondary'
			separatorClassName='text-sf-text-quaternary'
			tokens={shortcut}
		/>
	)
}

function ScopedPickerCommandGroup({
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
	onSelectTaskPriority: (priority: TaskPriorityValue) => void
	onSelectTaskStatus: (status: TaskStatus) => void
	onToggleCompletedFilter: () => void
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
		return (
			<CommandGroup className='pt-2' heading='优先级'>
				{TASK_PRIORITY_OPTIONS.map((option) => (
					<CommandItem
						key={option.value}
						onSelect={() => {
							onOpenChange(false)
							onSelectTaskPriority(option.value)
						}}
						value={`priority ${option.label} ${option.value}`}
					>
						<CommandRow
							leadingIcon={ListTodoIcon}
							title={option.label}
							trailing={<CommandRowMeta>{`P${option.value}`}</CommandRowMeta>}
						/>
					</CommandItem>
				))}
			</CommandGroup>
		)
	}

	if (mode === 'task-status-picker') {
		return (
			<CommandGroup className='pt-2' heading='状态'>
				{TASK_STATUS_OPTIONS.map((option) => (
					<CommandItem
						key={option.value}
						onSelect={() => {
							onOpenChange(false)
							onSelectTaskStatus(option.value)
						}}
						value={`status ${option.label} ${option.value}`}
					>
						<CommandRow leadingIcon={CircleIcon} title={option.label} />
					</CommandItem>
				))}
			</CommandGroup>
		)
	}

	if (mode === 'task-date-picker') {
		const options = getTaskDateOptions()
		return (
			<CommandGroup className='pt-2' heading='日期'>
				{options.map((option) => (
					<CommandItem
						disabled={option.disabled}
						key={option.key}
						onSelect={() => {
							if (option.disabled) {
								return
							}
							onOpenChange(false)
							onSelectTaskDate(option.value)
						}}
						value={`date ${option.label} ${option.key}`}
					>
						<CommandRow
							leadingIcon={CommandIcon}
							title={option.label}
							trailing={
								option.disabled && option.disabledReason ? (
									<CommandRowMeta>{option.disabledReason}</CommandRowMeta>
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
							leadingIcon={CircleIcon}
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
		const groups = buildTaskPlacementGroups({
			context,
			projects:
				result.projects.length > 0 || result.completedProjects.length > 0
					? result.projects
					: fallbackProjects,
			spaces,
		})

		return (
			<>
				{groups.map((group) => (
					<CommandGroup className='pt-1 first:pt-0' heading={group.heading} key={group.spaceId}>
						{group.items.map((item) => (
							<CommandItem
								key={item.key}
								onSelect={() => {
									onOpenChange(false)
									onSelectTaskPlacement(item.target)
								}}
								value={item.value}
							>
								<CommandRow
									leadingIcon={item.icon}
									title={item.title}
									trailing={<CommandRowMeta>{item.meta}</CommandRowMeta>}
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
						leadingIcon={FolderIcon}
						title={project.name}
						trailing={<CommandRowMeta>{`Project · ${project.spaceName}`}</CommandRowMeta>}
					/>
				</CommandItem>
			))}
		</CommandGroup>
	)
}

function FilterPickerCommandGroup({
	context,
	filterKind,
	onApplyFilter,
	onClearAllFilters,
	onOpenChange,
	onSelectFilterKind,
	onToggleCompletedFilter,
	projects,
	query,
}: {
	context: CommandContext
	filterKind: PageFilterKind
	onApplyFilter: (input: PageFilterApplyInput) => void
	onClearAllFilters: () => void
	onOpenChange: (open: boolean) => void
	onSelectFilterKind: (kind: PageFilterKind) => void
	onToggleCompletedFilter: () => void
	projects: CommandMenuProject[]
	query: string
}) {
	const capability = context.view.filterCapabilities

	if (filterKind === 'root') {
		const items = [
			capability.supportsPriority
				? { kind: 'priority' as const, title: '按优先级筛选', meta: formatPriorityMeta(context) }
				: null,
			capability.supportsStatus
				? { kind: 'status' as const, title: '按状态筛选', meta: formatStatusMeta(context) }
				: null,
			capability.supportsDate
				? { kind: 'date' as const, title: '按日期筛选', meta: formatDateMeta(context) }
				: null,
			capability.supportsProject
				? {
						kind: 'project' as const,
						title: '按项目筛选',
						meta: formatProjectMeta(context, projects),
					}
				: null,
		].filter((item): item is NonNullable<typeof item> => item !== null)

		return (
			<>
				<CommandGroup className='pt-2' heading='筛选维度'>
					{items.map((item) => (
						<CommandItem
							key={item.kind}
							onSelect={() => onSelectFilterKind(item.kind)}
							value={`${item.title} ${item.kind}`}
						>
							<CommandRow
								leadingIcon={CommandIcon}
								title={item.title}
								trailing={<CommandRowMeta>{item.meta}</CommandRowMeta>}
							/>
						</CommandItem>
					))}
				</CommandGroup>
				<CommandGroup className='pt-2' heading='快捷操作'>
					{capability.supportsToggleCompleted ? (
						<CommandItem
							onSelect={() => {
								onToggleCompletedFilter()
								onOpenChange(false)
							}}
							value='toggle completed'
						>
							<CommandRow
								leadingIcon={CheckCircle2Icon}
								title={context.view.showCompleted ? '隐藏已完成' : '显示已完成'}
							/>
						</CommandItem>
					) : null}
					{capability.supportsClearAll ? (
						<CommandItem
							onSelect={() => {
								onClearAllFilters()
								onOpenChange(false)
							}}
							value='clear filters'
						>
							<CommandRow leadingIcon={Trash2Icon} title='清除全部筛选' />
						</CommandItem>
					) : null}
				</CommandGroup>
			</>
		)
	}

	if (filterKind === 'priority') {
		return (
			<CommandGroup className='pt-2' heading='优先级筛选'>
				<CommandItem
					onSelect={() => {
						onApplyFilter({ kind: 'priority', values: [] })
						onOpenChange(false)
					}}
					value='priority all'
				>
					<CommandRow leadingIcon={ListTodoIcon} title='不过滤优先级' />
				</CommandItem>
				{TASK_PRIORITY_OPTIONS.map((option) => {
					const selected = context.view.priorityFilterValues.includes(option.value)
					return (
						<CommandItem
							key={option.value}
							onSelect={() => {
								onApplyFilter({
									kind: 'priority',
									values: selected
										? context.view.priorityFilterValues.filter((value) => value !== option.value)
										: [...context.view.priorityFilterValues, option.value].sort(
												(left, right) => right - left,
											),
								})
							}}
							value={`priority ${option.label} ${option.value}`}
						>
							<CommandRow
								leadingIcon={ListTodoIcon}
								title={option.label}
								trailing={
									<CommandRowMeta>{selected ? '已选中' : `P${option.value}`}</CommandRowMeta>
								}
							/>
						</CommandItem>
					)
				})}
			</CommandGroup>
		)
	}

	if (filterKind === 'status') {
		return (
			<CommandGroup className='pt-2' heading='状态筛选'>
				<CommandItem
					onSelect={() => {
						onApplyFilter({ kind: 'status', values: [] })
						onOpenChange(false)
					}}
					value='status all'
				>
					<CommandRow leadingIcon={CircleIcon} title='不过滤状态' />
				</CommandItem>
				{TASK_STATUS_OPTIONS.map((option) => {
					const selected = context.view.statusFilterValues.includes(option.value)
					return (
						<CommandItem
							key={option.value}
							onSelect={() => {
								onApplyFilter({
									kind: 'status',
									values: selected
										? context.view.statusFilterValues.filter((value) => value !== option.value)
										: [...context.view.statusFilterValues, option.value],
								})
							}}
							value={`status ${option.label} ${option.value}`}
						>
							<CommandRow
								leadingIcon={CircleIcon}
								title={option.label}
								trailing={selected ? <CommandRowMeta>已选中</CommandRowMeta> : null}
							/>
						</CommandItem>
					)
				})}
			</CommandGroup>
		)
	}

	if (filterKind === 'date') {
		return (
			<CommandGroup className='pt-2' heading='日期筛选'>
				{getFilterDateOptions().map((option) => {
					const selected = context.view.dateFilterValue === option.value
					return (
						<CommandItem
							key={option.value}
							onSelect={() => {
								onApplyFilter({
									kind: 'date',
									value: selected ? 'none' : option.value,
								})
								onOpenChange(false)
							}}
							value={`date ${option.label} ${option.value}`}
						>
							<CommandRow
								leadingIcon={CommandIcon}
								title={option.label}
								trailing={selected ? <CommandRowMeta>已选中</CommandRowMeta> : null}
							/>
						</CommandItem>
					)
				})}
			</CommandGroup>
		)
	}

	const filteredProjects = projects.filter((project) => {
		const text = `${project.label} ${project.spaceName ?? ''}`.toLowerCase()
		return text.includes(query.trim().toLowerCase())
	})
	return (
		<CommandGroup className='pt-2' heading='项目筛选'>
			<CommandItem
				onSelect={() => {
					onApplyFilter({ kind: 'project', projectId: null })
					onOpenChange(false)
				}}
				value='project all'
			>
				<CommandRow leadingIcon={FolderIcon} title='不过滤项目' />
			</CommandItem>
			{filteredProjects.map((project) => {
				const selected = context.view.projectFilterId === project.id
				return (
					<CommandItem
						key={project.id}
						onSelect={() => {
							onApplyFilter({
								kind: 'project',
								projectId: selected ? null : project.id,
							})
							onOpenChange(false)
						}}
						value={`${project.label} ${project.spaceName ?? ''}`}
					>
						<CommandRow
							leadingIcon={FolderIcon}
							title={project.label}
							trailing={
								<CommandRowMeta>
									{selected ? '已选中' : `Project · ${project.spaceName ?? ''}`}
								</CommandRowMeta>
							}
						/>
					</CommandItem>
				)
			})}
		</CommandGroup>
	)
}

type TaskDateOption = {
	key: string
	label: string
	value: string | null
	disabled?: boolean
	disabledReason?: string
}

function getTaskDateOptions(): TaskDateOption[] {
	const today = startOfLocalDay(new Date())
	const tomorrow = addLocalDays(today, 1)
	const endOfWeek = getEndOfLocalWeek(today)

	return [
		{ key: 'none', label: '无时间', value: null },
		{ key: 'today', label: '今天', value: formatLocalDate(today) },
		{ key: 'tomorrow', label: '明天', value: formatLocalDate(tomorrow) },
		{ key: 'week', label: '本周', value: formatLocalDate(endOfWeek) },
		{
			key: 'custom',
			label: '自定义日期',
			value: null,
			disabled: true,
			disabledReason: '完整日期选择后续接入',
		},
	]
}

function getFilterPickerPlaceholder(mode: CommandMenuMode, filterKind: PageFilterKind) {
	if (mode !== 'filter-picker') {
		return '输入命令 或 搜索 …'
	}

	switch (filterKind) {
		case 'priority':
			return '筛选优先级…'
		case 'status':
			return '筛选状态…'
		case 'date':
			return '筛选日期…'
		case 'project':
			return '搜索项目筛选…'
		default:
			return '选择筛选维度…'
	}
}

function getFilterDateOptions(): Array<{ label: string; value: PageDateFilterValue }> {
	return [
		{ label: '不过滤日期', value: 'none' },
		{ label: '今天', value: 'today' },
		{ label: '明天', value: 'tomorrow' },
		{ label: '本周', value: 'thisWeek' },
		{ label: '已逾期', value: 'overdue' },
		{ label: '有日期', value: 'hasDate' },
		{ label: '无日期', value: 'noDate' },
	]
}

function formatPriorityMeta(context: CommandContext) {
	return context.view.priorityFilterValues.length > 0
		? `已选 P${context.view.priorityFilterValues.join(', P')}`
		: '未筛选'
}

function formatStatusMeta(context: CommandContext) {
	return context.view.statusFilterValues.length > 0
		? `已选 ${context.view.statusFilterValues.join(' / ')}`
		: '未筛选'
}

function formatDateMeta(context: CommandContext) {
	return context.view.dateFilterValue === 'none' ? '未筛选' : context.view.dateFilterValue
}

function formatProjectMeta(context: CommandContext, projects: CommandMenuProject[]) {
	if (!context.view.projectFilterId) {
		return context.view.projectlessOnly ? '仅独立事项' : '未筛选'
	}

	const project = projects.find((item) => item.id === context.view.projectFilterId)
	return project?.label ?? '已选项目'
}

function startOfLocalDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addLocalDays(date: Date, days: number) {
	const next = new Date(date)
	next.setDate(next.getDate() + days)
	return next
}

type TaskPlacementGroup = {
	spaceId: string
	heading: string
	items: Array<{
		key: string
		title: string
		meta: string
		value: string
		target: TaskPlacementTarget
		icon: ComponentType<LucideProps>
	}>
}

function buildTaskPlacementGroups({
	context,
	projects,
	spaces,
}: {
	context: CommandContext
	projects: SearchProjectItem[]
	spaces: Space[]
}): TaskPlacementGroup[] {
	const currentSpaceId = resolveTaskPlacementCurrentSpaceId(context)
	if (!currentSpaceId) {
		return []
	}

	const activeProjects = projects.filter((project) => project.completedAt === null)
	const spaceNameById = new Map(spaces.map((space) => [space.id, space.name]))
	const projectsBySpaceId = new Map<string, SearchProjectItem[]>()

	for (const project of activeProjects) {
		const bucket = projectsBySpaceId.get(project.spaceId)
		if (bucket) {
			bucket.push(project)
		} else {
			projectsBySpaceId.set(project.spaceId, [project])
		}
	}

	const orderedSpaceIds = [
		currentSpaceId,
		...Array.from(projectsBySpaceId.keys()).filter((spaceId) => spaceId !== currentSpaceId),
	]

	return orderedSpaceIds.flatMap((spaceId) => {
		const items: TaskPlacementGroup['items'] = []
		const projectsInSpace = projectsBySpaceId.get(spaceId) ?? []

		if (spaceId === currentSpaceId) {
			items.push({
				key: `no-project:${spaceId}`,
				title: '独立事项',
				meta: 'No Project',
				value: `独立事项 ${spaceNameById.get(spaceId) ?? ''} no project`,
				target: { kind: 'no_project', spaceId },
				icon: CircleIcon,
			})
		}

		items.push(
			...projectsInSpace.map((project) => ({
				key: `project:${project.id}`,
				title: project.name,
				meta: `Project · ${project.spaceName}`,
				value: `${project.name} ${project.note ?? ''} ${project.spaceName}`,
				target: {
					kind: 'project' as const,
					projectId: project.id,
					spaceId: project.spaceId,
				},
				icon: FolderIcon,
			})),
		)

		if (items.length === 0) {
			return []
		}

		return [
			{
				spaceId,
				heading: spaceNameById.get(spaceId) ?? projectsInSpace[0]?.spaceName ?? spaceId,
				items,
			},
		]
	})
}

function resolveTaskPlacementCurrentSpaceId(context: CommandContext) {
	if (context.space.currentSpaceId) {
		return context.space.currentSpaceId
	}

	const selectionSpaceIds = new Set(
		context.selection.entities
			.filter((entity) => entity.type === 'task')
			.map((entity) => entity.spaceId)
			.filter((spaceId): spaceId is string => Boolean(spaceId)),
	)

	return selectionSpaceIds.size === 1 ? (Array.from(selectionSpaceIds)[0] ?? null) : null
}

function getEndOfLocalWeek(date: Date) {
	const day = date.getDay()
	const daysUntilSunday = (7 - day) % 7
	return addLocalDays(date, daysUntilSunday)
}

function formatLocalDate(date: Date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

function ProjectsCommandGroup({
	onNavigateProject,
	projects,
}: {
	onNavigateProject: (projectId: string) => void
	projects: CommandMenuProject[]
}) {
	return (
		<CommandGroup className='pt-4' heading='项目'>
			{projects.length === 0 ? (
				<CommandItem disabled value='empty-projects'>
					<CommandRow leadingIcon={FolderOpenIcon} title='当前 Space 还没有项目' />
				</CommandItem>
			) : (
				projects.map((project) => (
					<CommandItem
						key={project.id}
						onSelect={() => onNavigateProject(project.id)}
						value={project.label}
					>
						<CommandRow
							leadingIcon={FoldersIcon}
							title={project.label}
							trailing={
								project.badge ? (
									<Badge
										className='ml-auto h-5 rounded-full px-2 text-[10.5px]'
										variant={getProjectStatusBadgeVariant(project.badge)}
									>
										{project.badge}
									</Badge>
								) : null
							}
						/>
					</CommandItem>
				))
			)}
		</CommandGroup>
	)
}

function CommandRow({
	leadingIcon: LeadingIcon,
	title,
	trailing,
}: {
	leadingIcon: ComponentType<LucideProps>
	title: string
	trailing?: React.ReactNode
}) {
	return (
		<div className='flex w-full min-w-0 items-center gap-3'>
			<div className='flex size-4 shrink-0 items-center justify-center text-sf-icon-secondary'>
				<LeadingIcon className='size-4' />
			</div>
			<span className='min-w-0 flex-1 truncate text-[14px] font-medium text-foreground'>
				{title}
			</span>
			<div className='ml-auto flex shrink-0 items-center justify-end'>{trailing}</div>
		</div>
	)
}

function CommandRowMeta({ children }: { children: React.ReactNode }) {
	return (
		<span className='block max-w-48 truncate text-right text-[12px] text-sf-text-tertiary'>
			{children}
		</span>
	)
}

function resolveCommandIcon(commandId: CommandId): ComponentType<LucideProps> {
	if (commandId.startsWith('new.')) {
		if (commandId.includes('project')) {
			return FolderPlusIcon
		}
		if (commandId.includes('view')) {
			return SquarePlusIcon
		}
		return PlusIcon
	}

	if (commandId.startsWith('navigation.')) {
		if (commandId.includes('project')) {
			return LayoutGridIcon
		}
		if (commandId.includes('settings')) {
			return CommandIcon
		}
		return ArrowRightIcon
	}

	if (commandId.startsWith('open.')) {
		if (commandId.includes('project')) {
			return FolderOpenIcon
		}
		if (commandId.includes('space')) {
			return CompassIcon
		}
		return SearchIcon
	}

	if (commandId.startsWith('task.')) {
		if (commandId.includes('complete')) {
			return CheckCircle2Icon
		}
		return ListTodoIcon
	}

	if (commandId.startsWith('project.')) {
		return FolderIcon
	}

	if (commandId.startsWith('layout.')) {
		return PanelLeftIcon
	}

	if (commandId.startsWith('inbox.')) {
		return CircleIcon
	}

	if (commandId.startsWith('system.')) {
		return CommandIcon
	}

	if (commandId === 'general.close') {
		return Trash2Icon
	}

	return CommandIcon
}
