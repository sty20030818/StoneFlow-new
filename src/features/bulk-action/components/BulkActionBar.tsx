import { Button } from '@heroui/react'
import { ActionBar } from '@heroui-pro/react'
import { XIcon } from 'lucide-react'

import {
	COMMAND_IDS,
	CommandActionTooltip,
	DisabledCommandActionTooltip,
	type CommandContext,
	type CommandId,
	type CommandProjection,
	type CommandRuntime,
} from '@/features/command'

export type BulkActionBarProps = {
	runtime: CommandRuntime
	context: CommandContext
}

const TASK_ACTION_IDS = [COMMAND_IDS.openCommandMenu] as const
const PROJECT_ACTION_IDS = [COMMAND_IDS.projectArchive, COMMAND_IDS.projectDelete] as const
const LIFECYCLE_ACTION_IDS = [
	COMMAND_IDS.lifecycleRestore,
	COMMAND_IDS.lifecycleDelete,
	COMMAND_IDS.lifecycleDeletePermanently,
] as const

const DANGER_ACTION_IDS: ReadonlySet<CommandId> = new Set([
	COMMAND_IDS.projectDelete,
	COMMAND_IDS.lifecycleDeletePermanently,
])

/**
 * 壳层唯一批量操作表面。
 *
 * ActionBar 只负责标准 toolbar 视觉；命令元数据、可用性、目标快照与执行入口
 * 全部来自 Command Runtime，清空选择仍直接写回唯一 SelectionManager。
 */
export function BulkActionBar({ runtime, context }: BulkActionBarProps) {
	const selectedCount = context.selection.ids.length
	const projections = getActionCommandIds(context).flatMap((commandId) => {
		const projection = runtime.project(commandId, context)
		return projection?.visible ? [projection] : []
	})
	const isOpen = selectedCount > 0 && projections.length > 0

	return (
		<ActionBar aria-label='批量操作' isOpen={isOpen}>
			<ActionBar.Prefix>
				<span className='text-sm font-medium'>已选 {selectedCount} 项</span>
			</ActionBar.Prefix>

			<ActionBar.Content>
				{projections.map((projection) => (
					<BulkCommandButton key={projection.id} projection={projection} />
				))}
			</ActionBar.Content>

			<ActionBar.Suffix>
				<CommandActionTooltip commandId={COMMAND_IDS.selectionClear} label='清空已选' scope='list'>
					<Button
						aria-label='清空已选'
						isDisabled={!context.selection.clearSelection}
						isIconOnly
						onPress={context.selection.clearSelection}
						size='sm'
						variant='tertiary'
					>
						<XIcon />
					</Button>
				</CommandActionTooltip>
			</ActionBar.Suffix>
		</ActionBar>
	)
}

function BulkCommandButton({ projection }: { projection: CommandProjection }) {
	const button = (
		<Button
			isDisabled={!projection.enabled}
			onPress={() => void projection.execute({ source: 'bulk-bar' })}
			size='sm'
			variant={DANGER_ACTION_IDS.has(projection.id) ? 'danger' : 'tertiary'}
		>
			{projection.label}
		</Button>
	)

	if (!projection.enabled) {
		return (
			<DisabledCommandActionTooltip
				commandId={projection.id}
				label={projection.disabledReason ?? projection.label}
			>
				{button}
			</DisabledCommandActionTooltip>
		)
	}

	return (
		<CommandActionTooltip commandId={projection.id} label={projection.label}>
			{button}
		</CommandActionTooltip>
	)
}

function getActionCommandIds(context: CommandContext): readonly CommandId[] {
	if (!context.selection.hasSelection) {
		return []
	}

	switch (context.selection.type) {
		case 'task':
			return TASK_ACTION_IDS
		case 'project':
			return PROJECT_ACTION_IDS
		case 'lifecycle':
			return LIFECYCLE_ACTION_IDS
		default:
			return []
	}
}
