import { Button, Checkbox } from '@heroui/react'
import { ArchiveRestoreIcon, BoxIcon, FolderIcon, ListTodoIcon } from 'lucide-react'
import { useCallback, useMemo, useState, type Ref } from 'react'
import type { GridListItemAria } from 'react-aria'

import {
	COMMAND_IDS,
	useCommandRuntimeContext,
	type CommandContext,
	type CommandId,
	type CommandProjection,
} from '@/features/command'
import type { LifecycleEntry, LifecycleMode } from '@/shared/types'
import { formatShortDate } from '@/shared/lib/date'
import { cn } from '@/shared/lib/utils'
import { RowShell } from '@/shared/components/row'

import { buildLifecycleCommandSelection } from '../model/buildLifecycleCommandSelection'
import { LifecycleContextMenu } from './LifecycleContextMenu'

type LifecycleRowAdapterProps = {
	entry: LifecycleEntry
	mode: LifecycleMode
	contextEntries?: LifecycleEntry[]
	rowState: {
		isSelected: boolean
		isFocused: boolean
		focusSource: 'pointer' | 'keyboard' | null
	}
	rowProps?: GridListItemAria['rowProps']
	gridCellProps?: GridListItemAria['gridCellProps']
	rowRef?: Ref<HTMLDivElement>
	onContextMenuOpenChange?: (open: boolean) => void
	actions: {
		onToggleSelected: () => void
		onOpenDetail?: (entry: LifecycleEntry) => void
	}
}

/** 生命周期行直接消费 Command projection，不保留 mutation 或 bulk 旁路。 */
export function LifecycleRowAdapter({
	entry,
	mode,
	contextEntries,
	rowState,
	rowProps,
	gridCellProps,
	rowRef,
	onContextMenuOpenChange,
	actions,
}: LifecycleRowAdapterProps) {
	const { runtime, context } = useCommandRuntimeContext()
	const [isExecuting, setExecuting] = useState(false)
	const {
		onClick: _reactAriaPressClick,
		onKeyDown: reactAriaKeyDown,
		...ariaRowProps
	} = rowProps ?? {}
	const contextTargets = useMemo(
		() => (contextEntries && contextEntries.length > 0 ? contextEntries : [entry]),
		[contextEntries, entry],
	)
	const canOpenDetail =
		contextTargets.length === 1 &&
		mode === 'archive' &&
		entry.entityType !== 'project' &&
		typeof actions.onOpenDetail === 'function'
	const rowCommandContext = useMemo(
		() =>
			buildLifecycleCommandContext({
				baseContext: context,
				entries: [entry],
				targetIds: [entry.id],
				focusedEntryId: entry.id,
				mode,
			}),
		[context, entry, mode],
	)
	const contextMenuCommandContext = useMemo(
		() =>
			buildLifecycleCommandContext({
				baseContext: context,
				entries: contextTargets,
				targetIds: contextTargets.map((item) => item.id),
				focusedEntryId: entry.id,
				mode,
				clearSelection: contextEntries ? context.selection.clearSelection : undefined,
			}),
		[context, contextEntries, contextTargets, entry.id, mode],
	)
	const lifecycleCommand = useCallback(
		(commandId: CommandId) => runtime.project(commandId, contextMenuCommandContext),
		[contextMenuCommandContext, runtime],
	)
	const restoreCommand = runtime.project(COMMAND_IDS.lifecycleRestore, rowCommandContext)
	const createdAtValue = mode === 'archive' ? entry.archivedAt : entry.deletedAt

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
		<LifecycleContextMenu
			isBusy={isExecuting}
			lifecycleCommand={lifecycleCommand}
			onOpenChange={onContextMenuOpenChange}
			onOpenDetail={canOpenDetail ? () => actions.onOpenDetail?.(entry) : undefined}
			targetCount={contextTargets.length}
		>
			<RowShell
				{...ariaRowProps}
				ref={rowRef}
				aria-label={canOpenDetail ? `打开 ${entry.title}` : entry.title}
				className={cn(
					'group/lifecycle-row w-full text-[13px] leading-5 outline-none',
					canOpenDetail ? null : 'cursor-default',
				)}
				data-lifecycle-entity={entry.entityType}
				data-focus-source={rowState.isFocused ? rowState.focusSource : undefined}
				hovered={rowState.isFocused}
				hoverSource={rowState.focusSource}
				interactive={canOpenDetail}
				pending={isExecuting}
				role={ariaRowProps.role ?? 'row'}
				selected={rowState.isSelected}
				onClick={canOpenDetail ? () => actions.onOpenDetail?.(entry) : undefined}
				onKeyDown={(event) => {
					if (canOpenDetail && (event.key === 'Enter' || event.key === ' ')) {
						event.preventDefault()
						event.stopPropagation()
						actions.onOpenDetail?.(entry)
						return
					}
					reactAriaKeyDown?.(event)
				}}
			>
				<div {...gridCellProps} className='flex min-w-0 flex-1 items-center gap-3'>
					<span
						className={cn(
							'flex size-5 shrink-0 items-center justify-center',
							rowState.isSelected
								? 'opacity-100'
								: 'opacity-0 group-hover/lifecycle-row:opacity-100 group-focus-within/lifecycle-row:opacity-100',
						)}
						onClick={(event) => event.stopPropagation()}
						onKeyDown={(event) => event.stopPropagation()}
						onPointerDown={(event) => event.stopPropagation()}
					>
						<Checkbox
							aria-label={`选择 ${entry.title}`}
							isDisabled={isExecuting}
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
					<LifecycleEntityIcon entityType={entry.entityType} />
					<span className='min-w-0 flex-1 truncate font-medium'>{entry.title}</span>

					{restoreCommand?.visible ? (
						<span
							onClick={(event) => event.stopPropagation()}
							onKeyDown={(event) => event.stopPropagation()}
							onPointerDown={(event) => event.stopPropagation()}
						>
							<Button
								aria-description={restoreCommand.disabledReason}
								isDisabled={isExecuting || !restoreCommand.enabled}
								size='sm'
								variant='ghost'
								onPress={() => void executeRowCommand(restoreCommand)}
							>
								<ArchiveRestoreIcon />
								恢复
							</Button>
						</span>
					) : null}
					{createdAtValue ? (
						<span className='hidden shrink-0 text-xs text-muted md:inline'>
							{mode === 'archive' ? '归档' : '删除'} {formatShortDate(createdAtValue)}
						</span>
					) : null}
				</div>
			</RowShell>
		</LifecycleContextMenu>
	)
}

function buildLifecycleCommandContext({
	baseContext,
	entries,
	targetIds,
	focusedEntryId,
	mode,
	clearSelection,
}: {
	baseContext: CommandContext
	entries: readonly LifecycleEntry[]
	targetIds: readonly string[]
	focusedEntryId: string
	mode: LifecycleMode
	clearSelection?: () => void
}): CommandContext {
	return {
		...baseContext,
		selection: buildLifecycleCommandSelection({
			selectedIds: targetIds,
			entries,
			mode,
			focusedEntryId,
			clearSelection,
		}),
	}
}

function LifecycleEntityIcon({ entityType }: { entityType: LifecycleEntry['entityType'] }) {
	const Icon =
		entityType === 'space' ? FolderIcon : entityType === 'project' ? BoxIcon : ListTodoIcon
	return <Icon className='size-4 shrink-0 text-muted' />
}

export type { LifecycleRowAdapterProps }
