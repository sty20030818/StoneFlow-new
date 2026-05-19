import {
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type ComponentType,
	type ReactNode,
} from 'react'

import {
	ArrowRightIcon,
	CheckIcon,
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
	MinusIcon,
	PanelLeftIcon,
	PlusIcon,
	SearchIcon,
	SquarePlusIcon,
	Trash2Icon,
	type LucideProps,
} from 'lucide-react'

import { AppScrollArea } from '@/shared/ui/AppScrollArea'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { Kbd } from '@/shared/ui/base/kbd'
import type { ShortcutMenuItem } from '@/shared/ui/shortcut-menu'
import { ShortcutDigitSelectLayer } from '@/shared/ui/shortcut-menu'
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
import { type TaskPriorityValue } from '@/features/task/model/taskPriority'

import { ShortcutTokens } from './ShortcutTokens'
import { buildCommandMenuGroups, type CommandMenuEntry } from './command-menu-model'
import {
	getCommandMenuDateLeading,
	getCommandMenuPlacementLeading,
	getCommandMenuPriorityOptions,
	getCommandMenuStatusOptions,
} from './command-menu-option-visuals'
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

const COMMAND_SELECTION_CHIP_GAP_PX = 6
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

	const containerRef = useRef<HTMLDivElement>(null)
	const measureRef = useRef<HTMLDivElement>(null)
	const [visibleCount, setVisibleCount] = useState(entities.length)

	useLayoutEffect(() => {
		const container = containerRef.current
		const measure = measureRef.current
		if (!container || !measure) {
			return
		}

		const recalculate = () => {
			const nextVisibleCount = calculateVisibleSelectionChipCount({
				container,
				entityCount: entities.length,
				measure,
			})

			setVisibleCount((current) => (current === nextVisibleCount ? current : nextVisibleCount))
		}

		recalculate()

		if (typeof ResizeObserver === 'undefined') {
			return
		}

		const observer = new ResizeObserver(recalculate)
		observer.observe(container)

		return () => {
			observer.disconnect()
		}
	}, [entities])

	const visibleEntities = entities.slice(0, visibleCount)
	const hiddenCount = entities.length - visibleEntities.length

	return (
		<>
			<div
				aria-label='当前选中对象'
				className='flex items-center gap-1.5 overflow-hidden border-b border-sf-divider px-3 py-2'
				ref={containerRef}
			>
				{visibleEntities.map((entity) => (
					<ReadonlySelectionSummaryChip
						key={`${entity.type}:${entity.id}`}
						label={formatCommandSelectionSummaryLabel(entity)}
					/>
				))}
				{hiddenCount > 0 ? (
					<ReadonlySelectionSummaryChip label={`+${hiddenCount}`} tabular />
				) : null}
			</div>
			<div
				aria-hidden='true'
				className='pointer-events-none fixed top-0 left-0 -z-10 flex h-0 overflow-hidden opacity-0'
				ref={measureRef}
			>
				{entities.map((entity) => (
					<ReadonlySelectionSummaryChip
						data-selection-chip=''
						key={`measure-${entity.type}:${entity.id}`}
						label={formatCommandSelectionSummaryLabel(entity)}
					/>
				))}
				{Array.from({ length: entities.length }, (_, index) => index + 1).map((count) => (
					<ReadonlySelectionSummaryChip
						data-hidden-count={count}
						data-selection-overflow=''
						key={`measure-hidden-${count}`}
						label={`+${count}`}
						tabular
					/>
				))}
			</div>
		</>
	)
}

function ReadonlySelectionSummaryChip({
	label,
	tabular = false,
	...props
}: React.ComponentProps<typeof Button> & {
	label: string
	tabular?: boolean
}) {
	return (
		<Button
			aria-hidden='true'
			className={[
				'pointer-events-none max-w-56 shrink-0 cursor-default overflow-hidden',
				tabular ? 'tabular-nums' : null,
			]
				.filter(Boolean)
				.join(' ')}
			size='default'
			tabIndex={-1}
			type='button'
			variant='outline'
			{...props}
		>
			<span className='truncate'>{label}</span>
		</Button>
	)
}

function formatCommandSelectionSummaryLabel(entity: CommandSelectedEntity) {
	return entity.subtitle ? `${entity.title} · ${entity.subtitle}` : entity.title
}

function calculateVisibleSelectionChipCount({
	container,
	entityCount,
	measure,
}: {
	container: HTMLDivElement
	entityCount: number
	measure: HTMLDivElement
}) {
	if (entityCount === 0) {
		return 0
	}

	const availableWidth = container.clientWidth
	if (availableWidth <= 0) {
		return entityCount
	}

	const chipWidths = Array.from(measure.querySelectorAll<HTMLElement>('[data-selection-chip]')).map(
		(node) => node.getBoundingClientRect().width,
	)
	const overflowWidths = new Map(
		Array.from(measure.querySelectorAll<HTMLElement>('[data-selection-overflow]')).map((node) => [
			Number(node.dataset.hiddenCount ?? '0'),
			node.getBoundingClientRect().width,
		]),
	)

	let usedWidth = 0
	let visibleCount = 0

	for (let index = 0; index < entityCount; index += 1) {
		const chipWidth = chipWidths[index] ?? 0
		const nextUsedWidth =
			usedWidth + (visibleCount > 0 ? COMMAND_SELECTION_CHIP_GAP_PX : 0) + chipWidth
		const hiddenCount = entityCount - (index + 1)
		const requiredWidth =
			hiddenCount > 0
				? nextUsedWidth + COMMAND_SELECTION_CHIP_GAP_PX + (overflowWidths.get(hiddenCount) ?? 0)
				: nextUsedWidth

		if (requiredWidth > availableWidth) {
			break
		}

		usedWidth = nextUsedWidth
		visibleCount = index + 1
	}

	if (visibleCount > 0 || entityCount === 1) {
		return Math.max(visibleCount, 1)
	}

	const overflowOnlyWidth = overflowWidths.get(entityCount) ?? 0
	return overflowOnlyWidth <= availableWidth ? 0 : 1
}

function CommandScrollableList({ children }: { children: React.ReactNode }) {
	return (
		<AppScrollArea
			className='max-h-120'
			minThumbHeight={48}
			thumbLengthRatio={0.58}
			trackInsetBottom={8}
			trackInsetTop={4}
			viewportClassName='px-1 pb-2'
		>
			<CommandList className='max-h-none scroll-py-2 overflow-x-hidden overflow-y-visible outline-none'>
				{children}
			</CommandList>
		</AppScrollArea>
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
				leading={renderCommandIcon(resolveCommandIcon(entry.command.id))}
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
		const options = getCommandMenuPriorityOptions()
		const selectedPriorityValues = getSelectedTaskPriorityValues(context)
		const shortcutItems: ShortcutMenuItem<TaskPriorityValue>[] = options.map((option) => ({
			label: option.label,
			value: option.value,
			disabled: false,
			isEmptyValue: option.value === 0,
		}))
		return (
			<CommandGroup className='pt-2' heading='优先级'>
				<ShortcutDigitSelectLayer
					items={shortcutItems}
					onSelect={(item) => {
						onOpenChange(false)
						onSelectTaskPriority(item.value)
					}}
				/>
				{options.map((option, index) => (
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
									digit={String(index)}
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
		const options = getCommandMenuStatusOptions()
		const selectedStatusValues = getSelectedTaskStatusValues(context)
		const shortcutItems: ShortcutMenuItem<TaskStatus>[] = options.map((option) => ({
			label: option.label,
			value: option.value,
			disabled: false,
		}))
		return (
			<CommandGroup className='pt-2' heading='状态'>
				<ShortcutDigitSelectLayer
					items={shortcutItems}
					onSelect={(item) => {
						onOpenChange(false)
						onSelectTaskStatus(item.value)
					}}
				/>
				{options.map((option, index) => (
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
									digit={String(index + 1)}
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
		const options = getTaskDateOptions(context)
		const shortcutItems: ShortcutMenuItem<string | null>[] = options.map((option) => ({
			label: option.label,
			value: option.value,
			disabled: Boolean(option.disabled),
			isEmptyValue: option.key === 'none',
		}))
		return (
			<CommandGroup className='pt-2' heading='日期'>
				<ShortcutDigitSelectLayer
					items={shortcutItems}
					onSelect={(item) => {
						onOpenChange(false)
						onSelectTaskDate(item.value)
					}}
				/>
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
							leading={getCommandMenuDateLeading(option.key)}
							title={option.label}
							trailing={
								option.disabled && option.disabledReason ? (
									<CommandRowMeta>{option.disabledReason}</CommandRowMeta>
								) : option.digit ? (
									<CommandRowDigitHint digit={option.digit} />
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
		const groups = buildTaskPlacementGroups({
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
				isEmptyValue: item.target.kind === 'no_project',
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
				? {
						kind: 'priority' as const,
						title: '按优先级筛选',
						meta: formatPriorityMeta(context),
						leading: getCommandMenuDateLeading('none'),
					}
				: null,
			capability.supportsStatus
				? {
						kind: 'status' as const,
						title: '按状态筛选',
						meta: formatStatusMeta(context),
						leading: <CircleIcon className='size-4 text-sf-icon-secondary' />,
					}
				: null,
			capability.supportsDate
				? {
						kind: 'date' as const,
						title: '按日期筛选',
						meta: formatDateMeta(context),
						leading: getCommandMenuDateLeading('today'),
					}
				: null,
			capability.supportsProject
				? {
						kind: 'project' as const,
						title: '按项目筛选',
						meta: formatProjectMeta(context, projects),
						leading: getCommandMenuPlacementLeading('project'),
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
								leading={item.leading}
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
								leading={renderCommandIcon(CheckCircle2Icon)}
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
							<CommandRow leading={renderCommandIcon(Trash2Icon)} title='清除全部筛选' />
						</CommandItem>
					) : null}
				</CommandGroup>
			</>
		)
	}

	if (filterKind === 'priority') {
		const options = getCommandMenuPriorityOptions()
		return (
			<CommandGroup className='pt-2' heading='优先级筛选'>
				<CommandItem
					onSelect={() => {
						onApplyFilter({ kind: 'priority', values: [] })
						onOpenChange(false)
					}}
					value='priority all'
				>
					<CommandRow leading={getCommandMenuDateLeading('none')} title='不过滤优先级' />
				</CommandItem>
				{options.map((option) => {
					const selected = context.view.priorityFilterValues.includes(option.value)
					return (
						<CommandItem
							key={option.value}
							onSelect={() => {
								const nextValues: TaskPriorityValue[] = selected
									? context.view.priorityFilterValues.filter(
											(value): value is (typeof context.view.priorityFilterValues)[number] =>
												value !== option.value,
										)
									: [...context.view.priorityFilterValues, option.value].sort(
											(left, right) => right - left,
										)

								onApplyFilter({
									kind: 'priority',
									values: nextValues,
								})
							}}
							value={`priority ${option.label} ${option.value}`}
						>
							<CommandRow
								leading={option.leading}
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
		const options = getCommandMenuStatusOptions()
		return (
			<CommandGroup className='pt-2' heading='状态筛选'>
				<CommandItem
					onSelect={() => {
						onApplyFilter({ kind: 'status', values: [] })
						onOpenChange(false)
					}}
					value='status all'
				>
					<CommandRow leading={getCommandMenuDateLeading('none')} title='不过滤状态' />
				</CommandItem>
				{options.map((option) => {
					const selected = context.view.statusFilterValues.includes(option.value)
					return (
						<CommandItem
							key={option.value}
							onSelect={() => {
								const nextValues: TaskStatus[] = selected
									? context.view.statusFilterValues.filter(
											(value): value is (typeof context.view.statusFilterValues)[number] =>
												value !== option.value,
										)
									: [...context.view.statusFilterValues, option.value]

								onApplyFilter({
									kind: 'status',
									values: nextValues,
								})
							}}
							value={`status ${option.label} ${option.value}`}
						>
							<CommandRow
								leading={option.leading}
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
								leading={getCommandMenuDateLeading(option.value)}
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
				<CommandRow leading={getCommandMenuDateLeading('none')} title='不过滤项目' />
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
							leading={getCommandMenuPlacementLeading('project')}
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
	digit?: string
	disabled?: boolean
	disabledReason?: string
}

function getSelectedTaskPriorityValues(context: CommandContext) {
	const values = new Set<string>()
	for (const entity of context.selection.entities) {
		if (entity.type === 'task' && entity.priority != null) {
			values.add(String(entity.priority))
		}
	}
	return values
}

function getSelectedTaskStatusValues(context: CommandContext) {
	const values = new Set<string>()
	for (const entity of context.selection.entities) {
		if (entity.type === 'task' && entity.status) {
			values.add(entity.status)
		}
	}
	return values
}

function getSelectedTaskPlacementValues(context: CommandContext) {
	const values = new Set<string>()
	for (const entity of context.selection.entities) {
		if (entity.type !== 'task') {
			continue
		}
		if (entity.projectId) {
			values.add(`project:${entity.projectId}`)
			continue
		}
		if (entity.spaceId) {
			values.add(`no_project:${entity.spaceId}`)
		}
	}
	return values
}

function getTaskPlacementTargetValue(target: TaskPlacementTarget) {
	return target.kind === 'project' ? `project:${target.projectId}` : `no_project:${target.spaceId}`
}

function getSelectionIndicatorForValue(
	values: Set<string>,
	value: string,
): CommandRowSelectionIndicator {
	if (!values.has(value)) {
		return null
	}
	return values.size === 1 ? 'checked' : 'mixed'
}

function getTaskDateOptions(context: CommandContext): TaskDateOption[] {
	const today = startOfLocalDay(new Date())
	const tomorrow = addLocalDays(today, 1)
	const oneWeek = addLocalDays(today, 7)
	const hasExistingDate = context.selection.entities.some(
		(entity) => entity.type === 'task' && entity.dueAt !== undefined && entity.dueAt !== null,
	)

	const options: TaskDateOption[] = []

	if (hasExistingDate) {
		options.push({ key: 'none', label: '移除时间', value: null, digit: '0' })
	}

	options.push(
		{ key: 'tomorrow', label: '明天', value: formatLocalDate(tomorrow), digit: '1' },
		{ key: 'week', label: '本周', value: formatLocalDate(getEndOfLocalWeek(today)), digit: '2' },
		{ key: 'one-week', label: '一周', value: formatLocalDate(oneWeek), digit: '3' },
		{
			key: 'custom',
			label: '自定义日期',
			value: null,
			disabled: true,
			disabledReason: '完整日期选择后续接入',
		},
	)

	const customOption = options.find((option) => option.key === 'custom')
	if (customOption) {
		customOption.digit = '4'
	}

	return options
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
		leading: ReactNode
		digit?: string
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
				leading: getCommandMenuPlacementLeading('no_project'),
				digit: '0',
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
				leading: getCommandMenuPlacementLeading('project'),
				digit: undefined,
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
					<CommandRow leading={renderCommandIcon(FolderOpenIcon)} title='当前 Space 还没有项目' />
				</CommandItem>
			) : (
				projects.map((project) => (
					<CommandItem
						key={project.id}
						onSelect={() => onNavigateProject(project.id)}
						value={project.label}
					>
						<CommandRow
							leading={renderCommandIcon(FoldersIcon)}
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
	leading,
	title,
	trailing,
}: {
	leading: ReactNode
	title: string
	trailing?: React.ReactNode
}) {
	return (
		<div className='flex w-full min-w-0 items-center gap-3'>
			<div className='flex size-4 shrink-0 items-center justify-center'>{leading}</div>
			<span className='min-w-0 flex-1 truncate text-[14px] font-medium text-foreground'>
				{title}
			</span>
			<div className='ml-auto flex shrink-0 items-center justify-end'>{trailing}</div>
		</div>
	)
}

function renderCommandIcon(Icon: ComponentType<LucideProps>) {
	return <Icon className='size-4 text-sf-icon-secondary' />
}

function CommandRowMeta({ children }: { children: React.ReactNode }) {
	return (
		<span className='block max-w-48 truncate text-right text-[12px] text-sf-text-tertiary'>
			{children}
		</span>
	)
}

type CommandRowSelectionIndicator = 'checked' | 'mixed' | null

function CommandRowSelectionTrailing({
	digit,
	indicator,
}: {
	digit?: string
	indicator: CommandRowSelectionIndicator
}) {
	if (!digit && !indicator) {
		return null
	}

	return (
		<div className='flex items-center gap-2'>
			<span
				aria-hidden
				className='inline-flex size-3.5 shrink-0 items-center justify-center'
				data-indicator={indicator ?? 'none'}
				data-slot='command-row-selected-indicator'
			>
				{indicator === 'checked' ? (
					<CheckIcon className='size-3.5 text-sf-icon-secondary' />
				) : indicator === 'mixed' ? (
					<MinusIcon className='size-3.5 text-sf-icon-secondary' />
				) : null}
			</span>
			{digit ? <CommandRowDigitHint digit={digit} /> : null}
		</div>
	)
}

function CommandRowDigitHint({ digit }: { digit: string }) {
	return (
		<Kbd className='h-6 min-w-6 rounded-sm border border-sf-border-subtle bg-background/90 px-1.5 text-[11px] text-sf-text-secondary'>
			{digit}
		</Kbd>
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
