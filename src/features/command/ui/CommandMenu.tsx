import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/shared/ui/base/badge'
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from '@/shared/ui/base/command'
import { getProjectStatusBadgeVariant } from '@/shared/ui/badgeSemantics'
import { SearchIcon } from 'lucide-react'
import { useGlobalSearch } from '@/features/global-search/model/useGlobalSearch'
import type { CommandContext, CommandId, CommandRuntime } from '@/features/command/core'
import type { SearchProjectItem, SearchTaskItem } from '@/shared/types'

import { buildCommandMenuGroups, type CommandMenuEntry } from './command-menu-model'

export type CommandMenuMode = 'default' | 'task-picker' | 'project-picker'

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
	onSelectTask: (task: SearchTaskItem) => void
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
	onSelectTask,
	onRunCommand,
	open,
	projects,
	runtime,
	title,
}: CommandMenuProps) {
	const [query, setQuery] = useState('')
	const groups = useMemo(() => buildCommandMenuGroups(runtime, context), [context, runtime])
	const scopedSearch = useGlobalSearch(mode === 'default' ? '' : query)
	const isScopedMode = mode !== 'default'

	useEffect(() => {
		setQuery('')
	}, [mode, open])

	return (
		<CommandDialog
			className={className}
			description={description}
			onOpenChange={onOpenChange}
			open={open}
			title={title}
		>
			<Command className='bg-transparent' shouldFilter={!isScopedMode}>
				<CommandInput
					placeholder={getCommandMenuPlaceholder(mode)}
					value={query}
					onValueChange={setQuery}
				/>
				<CommandList className='no-scrollbar max-h-96 overflow-y-auto'>
					<CommandEmpty>{getCommandMenuEmptyText(mode, query)}</CommandEmpty>
					{isScopedMode ? (
						<ScopedPickerCommandGroup
							mode={mode}
							onOpenChange={onOpenChange}
							onSelectProject={onSelectProject}
							onSelectTask={onSelectTask}
							result={scopedSearch.result}
						/>
					) : (
						<>
							<CommandMenuList groups={groups} onOpenChange={onOpenChange} onRunCommand={onRunCommand} />
							<ProjectsCommandGroup
								onNavigateProject={onNavigateProject}
								projects={projects}
							/>
						</>
					)}
				</CommandList>
			</Command>
		</CommandDialog>
	)
}

function getCommandMenuPlaceholder(mode: CommandMenuMode) {
	switch (mode) {
		case 'task-picker':
			return '搜索任务…'
		case 'project-picker':
			return '搜索项目…'
		default:
			return '创建任务、跳转页面或打开详情…'
	}
}

function getCommandMenuEmptyText(mode: CommandMenuMode, query: string) {
	if (!query.trim()) {
		return mode === 'task-picker'
			? '输入关键词搜索任务'
			: mode === 'project-picker'
				? '输入关键词搜索项目'
				: '没有结果'
	}

	return mode === 'task-picker'
		? '没有匹配的任务'
		: mode === 'project-picker'
			? '没有匹配的项目'
			: '没有结果'
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
			{groups.map((group, index) => (
				<CommandMenuGroup
					group={group}
					key={group.key}
					onOpenChange={onOpenChange}
					onRunCommand={onRunCommand}
					showSeparator={index > 0}
				/>
			))}
			{groups.length > 0 ? <CommandSeparator /> : null}
		</>
	)
}

function CommandMenuGroup({
	group,
	onOpenChange,
	onRunCommand,
	showSeparator,
}: {
	group: ReturnType<typeof buildCommandMenuGroups>[number]
	onOpenChange: (open: boolean) => void
	onRunCommand: (id: CommandId) => void
	showSeparator: boolean
}) {
	return (
		<>
			{showSeparator ? <CommandSeparator /> : null}
			<CommandGroup heading={group.heading}>
				{group.entries.map((entry) => (
					<CommandMenuItem
						entry={entry}
						key={entry.command.id}
						onOpenChange={onOpenChange}
						onRunCommand={onRunCommand}
					/>
				))}
			</CommandGroup>
		</>
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
			<span className='min-w-0 flex-1 truncate'>{entry.command.title}</span>
			{entry.disabled && entry.disabledReason ? (
				<span className='ml-auto truncate text-xs text-muted-foreground'>{entry.disabledReason}</span>
			) : (
				<CommandMenuShortcut shortcut={entry.shortcut} />
			)}
		</CommandItem>
	)
}

function CommandMenuShortcut({ shortcut }: { shortcut: string | null }) {
	return shortcut ? <CommandShortcut>{shortcut}</CommandShortcut> : null
}

function ScopedPickerCommandGroup({
	mode,
	onOpenChange,
	onSelectProject,
	onSelectTask,
	result,
}: {
	mode: Exclude<CommandMenuMode, 'default'>
	onOpenChange: (open: boolean) => void
	onSelectProject: (project: SearchProjectItem) => void
	onSelectTask: (task: SearchTaskItem) => void
	result: ReturnType<typeof useGlobalSearch>['result']
}) {
	if (mode === 'task-picker') {
		const tasks = [...result.tasks, ...result.completedTasks]
		return (
			<CommandGroup heading='任务'>
				{tasks.map((task) => (
					<CommandItem
						key={task.id}
						onSelect={() => {
							onOpenChange(false)
							onSelectTask(task)
						}}
						value={`${task.title} ${task.note ?? ''} ${task.projectName ?? ''} ${task.spaceName}`}
					>
						<SearchIcon />
						<span className='min-w-0 flex-1 truncate'>{task.title}</span>
						<span className='ml-auto truncate text-xs text-muted-foreground'>
							{task.projectName ?? (task.inboxAt ? 'Inbox' : '独立事项')}
						</span>
					</CommandItem>
				))}
			</CommandGroup>
		)
	}

	const projects = [...result.projects, ...result.completedProjects]
	return (
		<CommandGroup heading='项目'>
			{projects.map((project) => (
				<CommandItem
					key={project.id}
					onSelect={() => {
						onOpenChange(false)
						onSelectProject(project)
					}}
					value={`${project.name} ${project.note ?? ''} ${project.spaceName}`}
				>
					<SearchIcon />
					<span className='min-w-0 flex-1 truncate'>{project.name}</span>
					<span className='ml-auto truncate text-xs text-muted-foreground'>{project.spaceName}</span>
				</CommandItem>
			))}
		</CommandGroup>
	)
}

function ProjectsCommandGroup({
	onNavigateProject,
	projects,
}: {
	onNavigateProject: (projectId: string) => void
	projects: CommandMenuProject[]
}) {
	return (
		<CommandGroup heading='Projects'>
			{projects.length === 0 ? (
				<CommandItem disabled value='empty-projects'>
					<SearchIcon />
					当前 Space 还没有项目
				</CommandItem>
			) : (
				projects.map((project) => (
					<CommandItem
						key={project.id}
						onSelect={() => onNavigateProject(project.id)}
						value={project.label}
					>
						<SearchIcon />
						{project.label}
						{project.badge ? (
							<Badge
								className='ml-auto h-4 rounded-md px-1.5 text-[10.5px]'
								variant={getProjectStatusBadgeVariant(project.badge)}
							>
								{project.badge}
							</Badge>
						) : null}
					</CommandItem>
				))
			)}
		</CommandGroup>
	)
}
