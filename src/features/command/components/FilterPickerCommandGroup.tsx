// CommandMenu 筛选维度与子筛选项选择面板。

import { CheckCircle2Icon, CircleIcon, Trash2Icon } from 'lucide-react'

import { CommandGroup, CommandItem } from '@/shared/components/base/command'
import {
	emitFilterUiEvent,
	pageFilterKindToField,
	type PageFilterApplyInput,
	type PageFilterKind,
} from '@/features/filter'
import type { CommandContext } from '@/features/command/core'
import type { TaskPriority, TaskStatus } from '@/shared/types'

import { CommandRow, CommandRowMeta, renderCommandIcon } from './CommandMenuListPrimitives'
import {
	formatDateMeta,
	formatPriorityMeta,
	formatProjectMeta,
	formatStatusMeta,
	getFilterDateOptions,
} from './command-menu-helpers'
import {
	getCommandMenuDateLeading,
	getCommandMenuPlacementLeading,
	getCommandMenuPriorityOptions,
	getCommandMenuStatusOptions,
} from './command-menu-option-visuals'
import type { CommandMenuProject } from './CommandMenu'

export function FilterPickerCommandGroup({
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
						title: '按截止时间筛选',
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
				<CommandGroup className='pt-2' heading='筛选（请使用工具条公式条）'>
					{items.map((item) => (
						<CommandItem
							key={item.kind}
							onSelect={() => {
								// 主路径：关闭 Command，打开锚定 FilterMenu
								onSelectFilterKind(item.kind)
								emitFilterUiEvent({
									type: 'open-menu',
									field: pageFilterKindToField(item.kind),
								})
								onOpenChange(false)
							}}
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
		// 用 Set 承载已选优先级，避免 map 循环内重复 array.includes 扫描
		const selectedPriorityValueSet = new Set(context.view.priorityFilterValues)
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
					const selected = selectedPriorityValueSet.has(option.value)
					return (
						<CommandItem
							key={option.value}
							onSelect={() => {
								const nextValues: TaskPriority[] = selected
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
		// 用 Set 承载已选状态，避免 map 循环内重复 array.includes 扫描
		const selectedStatusValueSet = new Set(context.view.statusFilterValues)
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
					const selected = selectedStatusValueSet.has(option.value)
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
			<CommandGroup className='pt-2' heading='截止时间筛选'>
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
