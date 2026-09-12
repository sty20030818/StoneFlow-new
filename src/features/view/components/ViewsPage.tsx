import { Button, Input, Skeleton } from '@heroui/react'
import { EmptyState, ListView } from '@heroui-pro/react'
import { AlertCircleIcon, BookmarkIcon, PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { PageFrame } from '@/shared/components/page-frame'
import { ActionTooltip } from '@/shared/components/tooltip'
import type { TaskViewBaseKey, ViewListItem } from '@/shared/types'

import { useSavedViewLibraryScene } from '../hooks/useViewsScene'
import { ViewActionsMenu } from './ViewActionsMenu'
import { ViewEditorDialog } from './ViewEditorDialog'

const BASE_VIEW_LABELS: Record<TaskViewBaseKey, string> = {
	all: '全部',
	active: '未完成',
	completed: '已完成',
	today: '今天',
	upcoming: '即将到期',
}

/** `/views`：只管理持久化 Saved View，不执行任务查询。 */
export function ViewsPage() {
	const scene = useSavedViewLibraryScene()

	return (
		<>
			<PageFrame.Root>
				<PageFrame.Header
					actions={
						<ActionTooltip label='新建保存视图'>
							<Button
								aria-label='新建保存视图'
								isIconOnly
								onPress={scene.editor.openCreate}
								size='sm'
								type='button'
								variant='outline'
							>
								<PlusIcon aria-hidden='true' className='size-4' />
							</Button>
						</ActionTooltip>
					}
					breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />}
				/>
				<PageFrame.Body>
					<div className='mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3'>
						<Input
							aria-label='搜索保存视图'
							fullWidth
							onChange={(event) => scene.setSearch(event.currentTarget.value)}
							placeholder='搜索保存视图'
							value={scene.search}
						/>
						<SavedViewLibraryContent scene={scene} />
					</div>
				</PageFrame.Body>
			</PageFrame.Root>

			<ViewEditorDialog
				flow={scene.editor.flow}
				onCreate={scene.editor.onCreate}
				onUpdate={scene.editor.onUpdate}
				projects={scene.editor.projects}
				view={scene.editor.view}
			/>
		</>
	)
}

type LibraryScene = ReturnType<typeof useSavedViewLibraryScene>

type LibraryContentScene = Pick<
	LibraryScene,
	'status' | 'views' | 'search' | 'openView' | 'deleteView' | 'reloadViews' | 'isReloading'
> & { editor: Pick<LibraryScene['editor'], 'openCreate' | 'openEdit'> }

export function SavedViewLibraryContent({ scene }: { scene: LibraryContentScene }) {
	if (scene.status === 'loading') {
		return (
			<div aria-label='正在加载保存视图' className='grid gap-1'>
				{Array.from({ length: 4 }, (_, index) => (
					<Skeleton className='h-11' key={index} />
				))}
			</div>
		)
	}

	if (scene.status === 'error') {
		return (
			<LibraryEmptyState
				role='alert'
				action={scene.reloadViews}
				actionLabel='重试读取'
				isPending={scene.isReloading}
				description='保存视图暂时无法读取，请稍后重试。'
				icon={<AlertCircleIcon />}
				title='读取保存视图失败'
			/>
		)
	}

	if (scene.views.length === 0) {
		const hasSearch = scene.search.trim().length > 0
		return (
			<LibraryEmptyState
				action={hasSearch ? undefined : scene.editor.openCreate}
				description={hasSearch ? '换个关键词试试。' : '创建一个保存视图，集中查看常用任务集合。'}
				icon={<BookmarkIcon />}
				title={hasSearch ? '没有匹配的保存视图' : '还没有保存视图'}
			/>
		)
	}

	return (
		<ListView
			aria-label='保存视图列表'
			items={scene.views}
			onAction={(key) => {
				const view = scene.views.find((candidate) => candidate.id === key)
				if (view) scene.openView(view)
			}}
			selectionMode='none'
			variant='secondary'
		>
			{(view) => (
				<ListView.Item
					id={view.id}
					textValue={`${view.name} ${describeView(view)} ${view.definitionError ?? ''}`}
				>
					<ListView.ItemContent>
						<BookmarkIcon aria-hidden='true' />
						{view.definitionError ? (
							<div className='min-w-0 flex-1'>
								<ListView.Title className='block wrap-anywhere whitespace-normal'>
									{view.name}
								</ListView.Title>
								<ListView.Description className='block wrap-anywhere whitespace-normal'>
									{describeView(view)} · {view.definitionError}
								</ListView.Description>
							</div>
						) : (
							<>
								<ListView.Title className='min-w-0 flex-1'>{view.name}</ListView.Title>
								<ListView.Description className='mt-0 shrink-0'>
									{describeView(view)}
								</ListView.Description>
							</>
						)}
					</ListView.ItemContent>
					<ListView.ItemAction>
						<ViewActionsMenu
							activeView={view}
							onDelete={scene.deleteView}
							onEdit={view.definitionError ? undefined : scene.editor.openEdit}
						/>
					</ListView.ItemAction>
				</ListView.Item>
			)}
		</ListView>
	)
}

function LibraryEmptyState({
	title,
	description,
	icon,
	action,
	actionLabel = '新建保存视图',
	isPending = false,
	role,
}: {
	title: string
	description: string
	icon: ReactNode
	action?: () => void
	actionLabel?: string
	isPending?: boolean
	role?: 'alert'
}) {
	return (
		<EmptyState className='mx-auto my-auto max-w-md' role={role}>
			<EmptyState.Header>
				{icon}
				<EmptyState.Title>{title}</EmptyState.Title>
				<EmptyState.Description>{description}</EmptyState.Description>
			</EmptyState.Header>
			{action ? (
				<EmptyState.Content>
					<Button isPending={isPending} onPress={action} size='sm' type='button' variant='outline'>
						{actionLabel}
					</Button>
				</EmptyState.Content>
			) : null}
		</EmptyState>
	)
}

function describeView(view: ViewListItem) {
	if (view.definitionError != null) return view.scope === null ? '范围未知' : '暂不可用'
	const context =
		view.context.kind === 'standalone'
			? '独立事项'
			: view.context.kind === 'project'
				? '项目'
				: '全部任务'
	return `${context} · ${BASE_VIEW_LABELS[view.baseViewKey]}`
}
