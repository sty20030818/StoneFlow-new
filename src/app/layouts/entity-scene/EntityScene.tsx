import type { ReactNode } from 'react'

import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { cn } from '@/shared/lib/utils'

import { LifecycleBoardAdapter } from './LifecycleBoardAdapter'
import { ProjectBoardAdapter } from './ProjectBoardAdapter'
import { TaskBoardAdapter } from './TaskBoardAdapter'
import type { EntitySceneBoardSlotProps, EntitySceneProps } from './types'

function EntitySceneRoot({ children }: { children: ReactNode }) {
	return <MainCard.Root>{children}</MainCard.Root>
}

function EntitySceneHeader({
	breadcrumb,
	headerActions,
	headerClassName,
}: Pick<EntitySceneProps, 'breadcrumb' | 'headerActions' | 'headerClassName'>) {
	return (
		<MainCard.Header action={headerActions} breadcrumb={breadcrumb} className={headerClassName} />
	)
}

function EntitySceneToolbar({
	toolbarPills,
	toolbarLeft,
	toolbarFilterAction,
	toolbarDisplayAction,
}: Pick<
	EntitySceneProps,
	'toolbarPills' | 'toolbarLeft' | 'toolbarFilterAction' | 'toolbarDisplayAction'
>) {
	if (!toolbarPills && !toolbarLeft && !toolbarFilterAction && !toolbarDisplayAction) {
		return null
	}

	return (
		<div className='px-2'>
			<MainCard.Toolbar
				displayAction={toolbarDisplayAction}
				filterAction={toolbarFilterAction}
				left={toolbarLeft}
				pills={toolbarPills}
			/>
		</div>
	)
}

function EntitySceneNotices({ notices }: { notices?: ReactNode }) {
	if (!notices) {
		return null
	}

	return <MainCard.NoticeGroup>{notices}</MainCard.NoticeGroup>
}

function EntitySceneBoardHeader({ boardHeader }: { boardHeader?: ReactNode }) {
	if (!boardHeader) {
		return null
	}

	return <>{boardHeader}</>
}

function EntitySceneBoardSlot(board: EntitySceneBoardSlotProps) {
	if (board.boardKind === 'task') {
		return (
			<TaskBoardAdapter
				actions={board.boardActions}
				config={board.boardConfig}
				data={board.boardData}
			/>
		)
	}

	if (board.boardKind === 'lifecycle') {
		return (
			<LifecycleBoardAdapter
				actions={board.boardActions}
				config={board.boardConfig}
				data={board.boardData}
			/>
		)
	}

	return (
		<ProjectBoardAdapter
			actions={board.boardActions}
			config={board.boardConfig}
			data={board.boardData}
		/>
	)
}

function EntitySceneBoardContent({ board }: { board?: EntitySceneBoardSlotProps }) {
	if (!board) {
		return null
	}

	return <EntitySceneBoardSlot {...board} />
}

function EntitySceneBody({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn('flex min-h-0 flex-1 flex-col gap-3', className)}>{children}</div>
}

function EntitySceneFooter({ footer }: { footer?: ReactNode }) {
	if (!footer) {
		return null
	}

	return <MainCard.Footer>{footer}</MainCard.Footer>
}

function EntitySceneBulkBar({ bulkBar }: { bulkBar?: ReactNode }) {
	if (!bulkBar) {
		return null
	}

	return <>{bulkBar}</>
}

function EntitySceneComponent({
	breadcrumb,
	headerActions,
	headerClassName,
	toolbarPills,
	toolbarLeft,
	toolbarFilterAction,
	toolbarDisplayAction,
	notices,
	boardHeader,
	beforeBoard,
	afterBoard,
	footer,
	bulkBar,
	bodyClassName,
	board,
}: EntitySceneProps) {
	return (
		<EntitySceneRoot>
			<EntitySceneHeader
				breadcrumb={breadcrumb}
				headerActions={headerActions}
				headerClassName={headerClassName}
			/>

			<EntitySceneToolbar
				toolbarDisplayAction={toolbarDisplayAction}
				toolbarFilterAction={toolbarFilterAction}
				toolbarLeft={toolbarLeft}
				toolbarPills={toolbarPills}
			/>

			<MainCard.Body>
				<EntitySceneBody className={bodyClassName}>
					<EntitySceneNotices notices={notices} />
					<EntitySceneBoardHeader boardHeader={boardHeader} />
					{beforeBoard}
					<EntitySceneBoardContent board={board} />
					{afterBoard}
					<EntitySceneFooter footer={footer} />
				</EntitySceneBody>
			</MainCard.Body>

			<EntitySceneBulkBar bulkBar={bulkBar} />
		</EntitySceneRoot>
	)
}

export const EntityScene = Object.assign(EntitySceneComponent, {
	Root: EntitySceneRoot,
	Header: EntitySceneHeader,
	Toolbar: EntitySceneToolbar,
	Body: EntitySceneBody,
	Footer: EntitySceneFooter,
	Empty: MainCard.Empty,
	BulkBar: EntitySceneBulkBar,
	Notices: EntitySceneNotices,
	BoardHeader: EntitySceneBoardHeader,
	BoardSlot: EntitySceneBoardSlot,
})
