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
	CommandContext,
	CommandId,
	CommandRuntime,
	CommandSelectedEntity,
} from '@/features/command/core'
import type { SearchProjectItem, SearchTaskItem, TaskStatus } from '@/shared/types'
import {
	TASK_PRIORITY_OPTIONS,
	type TaskPriorityValue,
} from '@/features/task/model/taskPriority'
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
}

type CommandMenuProps = {
	className?: string
	context: CommandContext
	description: string
	mode: CommandMenuMode
	onNavigateProject: (projectId: string) => void
	onOpenChange: (open: boolean) => void
	onSelectProject: (project: SearchProjectItem) => void
	onSelectTaskProject: (project: SearchProjectItem) => void
	onSelectTask: (task: SearchTaskItem) => void
	onSelectTaskDate: (dueAt: string | null) => void
	onSelectTaskPriority: (priority: TaskPriorityValue) => void
	onSelectTaskStatus: (status: TaskStatus) => void
	onRunCommand: (id: CommandId) => void
	open: boolean
	projects: CommandMenuProject[]
	runtime: CommandRuntime
	title: string
}

export function CommandMenu({
	className,
	context,
	description,
	mode,
	onNavigateProject,
	onOpenChange,
	onSelectProject,
	onSelectTaskProject,
	onSelectTask,
	onSelectTaskDate,
	onSelectTaskPriority,
	onSelectTaskStatus,
	onRunCommand,
	open,
	projects,
	runtime,
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
					placeholder={getCommandMenuPlaceholder(mode)}
					value={query}
					onValueChange={setQuery}
				/>
				<CommandMenuSelectionChips entities={context.selection.entities} />
				<CommandScrollableList>
					<CommandEmpty>{getCommandMenuEmptyText(mode, query)}</CommandEmpty>
					{isScopedMode ? (
						<ScopedPickerCommandGroup
							mode={mode}
							onOpenChange={onOpenChange}
							onSelectProject={onSelectProject}
							onSelectTaskProject={onSelectTaskProject}
							onSelectTask={onSelectTask}
							onSelectTaskDate={onSelectTaskDate}
							onSelectTaskPriority={onSelectTaskPriority}
							onSelectTaskStatus={onSelectTaskStatus}
							result={scopedSearch.result}
						/>
					) : (
						<>
							<CommandMenuList
								groups={groups}
								onOpenChange={onOpenChange}
								onRunCommand={onRunCommand}
							/>
							<ProjectsCommandGroup onNavigateProject={onNavigateProject} projects={projects} />
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

function getCommandMenuPlaceholder(mode: CommandMenuMode) {
	switch (mode) {
		case 'task-picker':
			return '搜索任务…'
		case 'project-picker':
			return '搜索项目…'
		case 'task-project-picker':
			return '移动到项目…'
		case 'task-priority-picker':
			return '选择优先级…'
		case 'task-status-picker':
			return '选择状态…'
		case 'task-date-picker':
			return '选择日期…'
		default:
			return '输入命令 或 搜索 …'
	}
}

function getCommandMenuEmptyText(mode: CommandMenuMode, query: string) {
	if (isCommandMenuTaskPropertyMode(mode)) {
		return '没有可用选项'
	}

	if (!query.trim()) {
		return mode === 'task-picker'
			? '输入关键词搜索任务'
			: mode === 'project-picker' || mode === 'task-project-picker'
				? '输入关键词搜索项目'
				: '没有可用命令'
	}

	return mode === 'task-picker'
		? '没有匹配的任务'
		: mode === 'project-picker' || mode === 'task-project-picker'
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
	mode,
	onOpenChange,
	onSelectProject,
	onSelectTaskProject,
	onSelectTask,
	onSelectTaskDate,
	onSelectTaskPriority,
	onSelectTaskStatus,
	result,
}: {
	mode: Exclude<CommandMenuMode, 'default'>
	onOpenChange: (open: boolean) => void
	onSelectProject: (project: SearchProjectItem) => void
	onSelectTaskProject: (project: SearchProjectItem) => void
	onSelectTask: (task: SearchTaskItem) => void
	onSelectTaskDate: (dueAt: string | null) => void
	onSelectTaskPriority: (priority: TaskPriorityValue) => void
	onSelectTaskStatus: (status: TaskStatus) => void
	result: ReturnType<typeof useGlobalSearch>['result']
}) {
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

	const projects = [...result.projects, ...result.completedProjects]
	return (
		<CommandGroup className='pt-2' heading='项目'>
			{projects.map((project) => (
				<CommandItem
					key={project.id}
					onSelect={() => {
						onOpenChange(false)
						if (mode === 'task-project-picker') {
							onSelectTaskProject(project)
							return
						}
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

function startOfLocalDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addLocalDays(date: Date, days: number) {
	const next = new Date(date)
	next.setDate(next.getDate() + days)
	return next
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
