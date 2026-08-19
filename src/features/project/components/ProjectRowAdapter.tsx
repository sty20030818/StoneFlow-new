import { Button, Checkbox } from '@heroui/react'
import { ArchiveIcon, FolderIcon, Trash2Icon } from 'lucide-react'
import { useCallback, useMemo, useState, type Ref } from 'react'
import type { GridListItemAria } from 'react-aria'

import {
	COMMAND_IDS,
	useCommandRuntimeContext,
	type CommandContext,
	type CommandId,
	type CommandProjection,
} from '@/features/command'
import type { ProjectOverviewItem } from '@/shared/types'
import { formatShortDate } from '@/shared/lib/date'
import { cn } from '@/shared/lib/utils'

import { buildProjectCommandSelection } from '../model/buildProjectCommandSelection'
import { ProjectContextMenu } from './ProjectContextMenu'

type ProjectRowAdapterProps = {
	project: ProjectOverviewItem
	contextProjects?: ProjectOverviewItem[]
	rowState: {
		isPending: boolean
		isSelected: boolean
		isFocused: boolean
		focusSource: 'pointer' | 'keyboard' | null
	}
	rowProps?: GridListItemAria['rowProps']
	gridCellProps?: GridListItemAria['gridCellProps']
	rowRef?: Ref<HTMLDivElement>
	onContextMenuOpenChange?: (open: boolean) => void
	actions: {
		onOpenProject: (projectId: string) => void
		onCompleteProject: (projectId: string) => void
		onReopenProject: (projectId: string) => void
		onToggleSelected: () => void
	}
}

/** 项目行直接组合 HeroUI；危险写入只执行 Stage J Command projection。 */
export function ProjectRowAdapter({
	project,
	contextProjects,
	rowState,
	rowProps,
	gridCellProps,
	rowRef,
	onContextMenuOpenChange,
	actions,
}: ProjectRowAdapterProps) {
	const { runtime, context } = useCommandRuntimeContext()
	const [isExecuting, setExecuting] = useState(false)
	const { onClick: _reactAriaPressClick, ...ariaRowProps } = rowProps ?? {}
	const contextTargets = useMemo(
		() => (contextProjects && contextProjects.length > 0 ? contextProjects : [project]),
		[contextProjects, project],
	)
	const rowCommandContext = useMemo(
		() =>
			buildProjectCommandContext({
				baseContext: context,
				projects: [project],
				targetIds: [project.id],
				focusedProjectId: project.id,
				rowTargetId: project.id,
				rowTargetSource: rowState.focusSource === 'keyboard' ? 'focus' : 'hover',
			}),
		[context, project, rowState.focusSource],
	)
	const contextMenuCommandContext = useMemo(
		() =>
			buildProjectCommandContext({
				baseContext: context,
				projects: contextTargets,
				targetIds: contextTargets.map((item) => item.id),
				focusedProjectId: project.id,
				rowTargetId: project.id,
				rowTargetSource: 'context-menu',
				clearSelection: contextProjects ? context.selection.clearSelection : undefined,
			}),
		[context, contextProjects, contextTargets, project.id],
	)
	const projectContextMenuCommand = useCallback(
		(commandId: CommandId) => runtime.project(commandId, contextMenuCommandContext),
		[contextMenuCommandContext, runtime],
	)
	const archiveCommand = runtime.project(COMMAND_IDS.projectArchive, rowCommandContext)
	const deleteCommand = runtime.project(COMMAND_IDS.projectDelete, rowCommandContext)
	const busy = rowState.isPending || isExecuting

	const executeRowCommand = useCallback(async (command: CommandProjection | null) => {
		if (!command?.enabled) return
		setExecuting(true)
		try {
			await command.execute({ source: 'row' })
		} finally {
			setExecuting(false)
		}
	}, [])

	return (
		<ProjectContextMenu
			isBusy={busy}
			onOpenChange={onContextMenuOpenChange}
			onOpenProject={() => actions.onOpenProject(project.id)}
			projectCommand={projectContextMenuCommand}
		>
			<div
				{...ariaRowProps}
				ref={rowRef}
				aria-label={`打开项目 ${project.name}`}
				role={ariaRowProps.role ?? 'row'}
				className={cn(
					'group/project-row flex min-h-11 w-full items-center rounded-lg border border-transparent px-3 py-2 text-[13px] leading-5 outline-none',
					rowState.isSelected
						? 'bg-accent-soft hover:bg-accent-soft-hover group-data-[open=true]/project-context-menu:bg-accent-soft-hover'
						: 'hover:bg-surface-hover group-data-[open=true]/project-context-menu:bg-surface-hover',
					rowState.isFocused && rowState.focusSource === 'keyboard' ? 'border-focus-subtle' : null,
					busy ? 'opacity-70' : null,
				)}
				data-project-id={project.id}
				data-focus-source={rowState.isFocused ? rowState.focusSource : undefined}
				onClick={() => actions.onOpenProject(project.id)}
			>
				<div {...gridCellProps} className='flex min-w-0 flex-1 items-center gap-3'>
					<span
						className={cn(
							'flex size-5 shrink-0 items-center justify-center',
							rowState.isSelected
								? 'opacity-100'
								: 'opacity-0 group-hover/project-row:opacity-100 group-focus-within/project-row:opacity-100',
						)}
						onClick={(event) => event.stopPropagation()}
						onKeyDown={(event) => event.stopPropagation()}
						onPointerDown={(event) => event.stopPropagation()}
					>
						<Checkbox
							aria-label={`选择项目 ${project.name}`}
							isDisabled={busy}
							isSelected={rowState.isSelected}
							onChange={actions.onToggleSelected}
							onClick={(event) => event.stopPropagation()}
							onKeyDown={(event) => event.stopPropagation()}
						>
							<Checkbox.Content>
								<Checkbox.Control>
									<Checkbox.Indicator />
								</Checkbox.Control>
							</Checkbox.Content>
						</Checkbox>
					</span>
					<FolderIcon className='size-4 shrink-0 text-muted' />
					<span className='min-w-0 flex-1 truncate font-medium'>{project.name}</span>

					<div
						className='ml-auto flex shrink-0 items-center gap-1'
						onClick={(event) => event.stopPropagation()}
						onKeyDown={(event) => event.stopPropagation()}
						onPointerDown={(event) => event.stopPropagation()}
					>
						<Button
							isDisabled={busy}
							size='sm'
							variant='ghost'
							onPress={() =>
								project.completedAt
									? actions.onReopenProject(project.id)
									: actions.onCompleteProject(project.id)
							}
						>
							{project.completedAt ? '重开' : '完成'}
						</Button>
						{archiveCommand?.visible ? (
							<Button
								aria-description={archiveCommand.disabledReason}
								isDisabled={busy || !archiveCommand.enabled}
								size='sm'
								variant='ghost'
								onPress={() => void executeRowCommand(archiveCommand)}
							>
								<ArchiveIcon />
								归档
							</Button>
						) : null}
						{deleteCommand?.visible ? (
							<Button
								aria-description={deleteCommand.disabledReason}
								isDisabled={busy || !deleteCommand.enabled}
								size='sm'
								variant='ghost'
								onPress={() => void executeRowCommand(deleteCommand)}
							>
								<Trash2Icon />
								删除
							</Button>
						) : null}
					</div>

					<div className='hidden shrink-0 items-center gap-3 text-xs text-muted md:flex'>
						{project.dueAt ? <span>截止 {formatShortDate(project.dueAt)}</span> : null}
						<span>创建 {formatShortDate(project.createdAt)}</span>
					</div>
				</div>
			</div>
		</ProjectContextMenu>
	)
}

function buildProjectCommandContext({
	baseContext,
	projects,
	targetIds,
	focusedProjectId,
	rowTargetId,
	rowTargetSource,
	clearSelection,
}: {
	baseContext: CommandContext
	projects: readonly ProjectOverviewItem[]
	targetIds: readonly string[]
	focusedProjectId: string
	rowTargetId: string
	rowTargetSource: 'hover' | 'focus' | 'context-menu'
	clearSelection?: () => void
}): CommandContext {
	return {
		...baseContext,
		selection: buildProjectCommandSelection({
			selectedIds: targetIds,
			projects,
			focusedProjectId,
			clearSelection,
		}),
		rowTarget: {
			targetId: rowTargetId,
			targetType: 'project',
			source: rowTargetSource,
			hasTarget: true,
			isTaskTarget: false,
			isProjectTarget: true,
		},
	}
}

export type { ProjectRowAdapterProps }
