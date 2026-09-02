import { Button, Checkbox } from '@heroui/react'
import { FolderIcon } from 'lucide-react'
import { useCallback, useMemo, type Ref } from 'react'
import type { GridListItemAria } from 'react-aria'

import { useCommandRuntimeContext, type CommandContext, type CommandId } from '@/features/command'
import type { ProjectOverviewItem } from '@/shared/types'
import { formatShortDate } from '@/shared/lib/date'
import { RowLayout, RowShell } from '@/shared/components/row'

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
	const { onClick: _reactAriaPressClick, ...ariaRowProps } = rowProps ?? {}
	const contextTargets = useMemo(
		() => (contextProjects && contextProjects.length > 0 ? contextProjects : [project]),
		[contextProjects, project],
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
	const busy = rowState.isPending

	return (
		<ProjectContextMenu
			isBusy={busy}
			onOpenChange={onContextMenuOpenChange}
			onOpenProject={() => actions.onOpenProject(project.id)}
			projectCommand={projectContextMenuCommand}
		>
			<RowShell
				{...ariaRowProps}
				ref={rowRef}
				aria-label={`打开项目 ${project.name}`}
				role={ariaRowProps.role ?? 'row'}
				className='w-full text-[13px] leading-5 outline-none'
				data-project-id={project.id}
				data-focus-source={rowState.isFocused ? rowState.focusSource : undefined}
				hovered={rowState.isFocused}
				hoverSource={rowState.focusSource}
				interactive
				onClick={() => actions.onOpenProject(project.id)}
				pending={busy}
				selected={rowState.isSelected}
			>
				<div {...gridCellProps} className='min-w-0 flex-1'>
					<RowLayout
						selection={
							<Checkbox
								aria-label={`选择项目 ${project.name}`}
								isDisabled={busy}
								isSelected={rowState.isSelected}
								onChange={actions.onToggleSelected}
							>
								<Checkbox.Content>
									<Checkbox.Control>
										<Checkbox.Indicator />
									</Checkbox.Control>
								</Checkbox.Content>
							</Checkbox>
						}
						leading={<FolderIcon className='size-4 shrink-0 text-muted' />}
						primary={<span className='block truncate font-medium'>{project.name}</span>}
						properties={
							<>
								{project.dueAt ? <span>截止 {formatShortDate(project.dueAt)}</span> : null}
								<span>创建 {formatShortDate(project.createdAt)}</span>
							</>
						}
						actions={
							<Button
								isDisabled={busy}
								onPress={() =>
									project.completedAt
										? actions.onReopenProject(project.id)
										: actions.onCompleteProject(project.id)
								}
								size='sm'
								variant='ghost'
							>
								{project.completedAt ? '重开' : '完成'}
							</Button>
						}
					/>
				</div>
			</RowShell>
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
