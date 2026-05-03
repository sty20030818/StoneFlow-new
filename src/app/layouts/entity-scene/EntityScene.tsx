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
		<MainCard.Header
			action={headerActions}
			breadcrumb={breadcrumb}
			className={headerClassName}
		/>
	)
}

function EntitySceneToolbar({
	toolbarPills,
	toolbarLeft,
	toolbarFilterAction,
	onRefresh,
	refreshDisabled,
}: Pick<
	EntitySceneProps,
	'toolbarPills' | 'toolbarLeft' | 'toolbarFilterAction' | 'onRefresh' | 'refreshDisabled'
>) {
	if (!toolbarPills && !toolbarLeft && !toolbarFilterAction && !onRefresh) {
		return null
	}

	return (
		<MainCard.Toolbar
			filterAction={toolbarFilterAction}
			left={toolbarLeft}
			onRefresh={onRefresh}
			pills={toolbarPills}
			refreshDisabled={refreshDisabled}
		/>
	)
}

function EntitySceneNotices({ notices }: { notices?: ReactNode }) {
	if (!notices) {
		return null
	}

	return <MainCard.NoticeGroup>{notices}</MainCard.NoticeGroup>
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

function EntitySceneBody({
	children,
	className,
}: {
	children: ReactNode
	className?: string
}) {
	return <div className={cn('flex min-h-0 flex-1 flex-col gap-3', className)}>{children}</div>
}

function EntitySceneFooter({ footer }: { footer?: ReactNode }) {
	if (!footer) {
		return null
	}

	return <MainCard.Footer>{footer}</MainCard.Footer>
}

function EntitySceneBulkActions({ bulkActions }: { bulkActions?: ReactNode }) {
	if (!bulkActions) {
		return null
	}

	return <>{bulkActions}</>
}

function EntitySceneComponent({
	breadcrumb,
	headerActions,
	headerClassName,
	toolbarPills,
	toolbarLeft,
	toolbarFilterAction,
	onRefresh,
	refreshDisabled,
	notices,
	beforeBoard,
	afterBoard,
	footer,
	bulkActions,
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

			<MainCard.Body>
				<EntitySceneToolbar
					onRefresh={onRefresh}
					refreshDisabled={refreshDisabled}
					toolbarFilterAction={toolbarFilterAction}
					toolbarLeft={toolbarLeft}
					toolbarPills={toolbarPills}
				/>

				<EntitySceneBody className={bodyClassName}>
					<EntitySceneNotices notices={notices} />
					{beforeBoard}
					<EntitySceneBoardSlot {...board} />
					{afterBoard}
					<EntitySceneBulkActions bulkActions={bulkActions} />
					<EntitySceneFooter footer={footer} />
				</EntitySceneBody>
			</MainCard.Body>
		</EntitySceneRoot>
	)
}

export const EntityScene = Object.assign(EntitySceneComponent, {
	Root: EntitySceneRoot,
	Header: EntitySceneHeader,
	Toolbar: EntitySceneToolbar,
	Filters: EntitySceneToolbar,
	Body: EntitySceneBody,
	Footer: EntitySceneFooter,
	Empty: MainCard.Empty,
	BulkActions: EntitySceneBulkActions,
	Notices: EntitySceneNotices,
	BoardSlot: EntitySceneBoardSlot,
})
