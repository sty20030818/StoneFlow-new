import { ActionBar } from '@heroui-pro/react'
import { Button, Chip, Separator } from '@heroui/react'
import { ArchiveIcon, Trash2Icon, XIcon } from 'lucide-react'

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

const TASK_ACTION_IDS = [
	COMMAND_IDS.openCommandMenu,
	COMMAND_IDS.taskArchive,
	COMMAND_IDS.taskDelete,
] as const
const PROJECT_ACTION_IDS = [COMMAND_IDS.projectArchive, COMMAND_IDS.projectDelete] as const
const LIFECYCLE_ACTION_IDS = [
	COMMAND_IDS.lifecycleRestore,
	COMMAND_IDS.lifecycleDelete,
	COMMAND_IDS.lifecycleDeletePermanently,
] as const

const DANGER_ACTION_IDS: ReadonlySet<CommandId> = new Set([
	COMMAND_IDS.taskDelete,
	COMMAND_IDS.projectDelete,
	COMMAND_IDS.lifecycleDeletePermanently,
])

/**
 * 壳层唯一批量操作表面。
 *
 * HeroUI ActionBar 负责开合动效、键盘导航与控件语义；命令元数据、可用性、目标快照与执行入口
 * 全部来自 Command Runtime，清空选择仍直接写回唯一 SelectionManager。
 */
export function BulkActionBar({ runtime, context }: BulkActionBarProps) {
	const selectedCount = context.selection.ids.length
	const projections = getActionCommandIds(context).flatMap((commandId) => {
		const projection = runtime.project(commandId, context)
		return projection?.visible ? [projection] : []
	})
	const primaryProjections = projections.filter(({ id }) => !DANGER_ACTION_IDS.has(id))
	const dangerProjections = projections.filter(({ id }) => DANGER_ACTION_IDS.has(id))
	const isOpen = selectedCount > 0 && projections.length > 0

	return (
		// 透明内边距扩展上游 filter 层的绘制范围，pill 仍距 main 底边 12px。
		<div className='contents *:data-[slot=action-bar]:absolute *:data-[slot=action-bar]:bottom-0 *:data-[slot=action-bar]:py-3'>
			<ActionBar aria-label='批量操作' isOpen={isOpen}>
				<ActionBar.Prefix>
					<Chip className='shrink-0' size='sm'>
						{selectedCount}
					</Chip>
				</ActionBar.Prefix>
				<Separator />
				<ActionBar.Content>
					{primaryProjections.map((projection) => (
						<BulkCommandButton key={projection.id} projection={projection} />
					))}
					{primaryProjections.length > 0 && dangerProjections.length > 0 ? (
						<Separator orientation='vertical' />
					) : null}
					{dangerProjections.map((projection) => (
						<BulkCommandButton key={projection.id} projection={projection} />
					))}
				</ActionBar.Content>
				<Separator />
				<ActionBar.Suffix>
					<CommandActionTooltip
						commandId={COMMAND_IDS.selectionClear}
						label='清空已选'
						scope='list'
					>
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
		</div>
	)
}

function BulkCommandButton({ projection }: { projection: CommandProjection }) {
	const isDanger = DANGER_ACTION_IDS.has(projection.id)
	const isTaskQuickAction =
		projection.id === COMMAND_IDS.taskArchive || projection.id === COMMAND_IDS.taskDelete
	const button = (
		<Button
			aria-label={projection.label}
			isDisabled={!projection.enabled}
			isIconOnly={isTaskQuickAction}
			onPress={() => void projection.execute({ source: 'bulk-bar' })}
			size='sm'
			variant={isDanger ? 'danger' : 'tertiary'}
		>
			{projection.id === COMMAND_IDS.taskArchive ? <ArchiveIcon aria-hidden /> : null}
			{isDanger ? <Trash2Icon aria-hidden /> : null}
			{!isTaskQuickAction ? (
				<span className={isDanger ? 'sr-only sm:not-sr-only' : undefined}>{projection.label}</span>
			) : null}
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
