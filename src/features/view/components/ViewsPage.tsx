import { Button, Input, Skeleton } from '@heroui/react'
import { EmptyState } from '@heroui-pro/react'
import { AlertCircleIcon, BookmarkIcon, PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { PageFrame } from '@/shared/components/page-frame'
import { ActionTooltip } from '@/shared/components/tooltip'
import type { TaskViewBaseKey, View } from '@/shared/types'

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
				isSubmitting={scene.editor.isSubmitting}
				onClose={scene.editor.onClose}
				onCreate={scene.editor.onCreate}
				onUpdate={scene.editor.onUpdate}
				open={scene.editor.open}
				projects={scene.editor.projects}
				view={scene.editor.view}
			/>
		</>
	)
}

type LibraryScene = ReturnType<typeof useSavedViewLibraryScene>

function SavedViewLibraryContent({ scene }: { scene: LibraryScene }) {
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
		<div aria-label='保存视图列表' className='grid gap-1' role='list'>
			{scene.views.map((view) => (
				<div
					className='flex h-11 items-center gap-1 rounded-large border border-transparent px-1 hover:border-default hover:bg-default/40'
					key={view.id}
					role='listitem'
				>
					<button
						className='flex min-w-0 flex-1 items-center gap-3 rounded-large px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-focus'
						onClick={() => scene.openView(view)}
						type='button'
					>
						<BookmarkIcon aria-hidden='true' className='size-4 shrink-0 text-muted' />
						<span className='min-w-0 flex-1 truncate font-medium'>{view.name}</span>
						<span className='shrink-0 text-xs text-muted'>{describeView(view)}</span>
					</button>
					<ViewActionsMenu
						activeView={view}
						onDelete={(target) => void scene.deleteView(target)}
						onEdit={view.definitionError ? undefined : scene.editor.openEdit}
					/>
				</div>
			))}
		</div>
	)
}

function LibraryEmptyState({
	title,
	description,
	icon,
	action,
}: {
	title: string
	description: string
	icon: ReactNode
	action?: () => void
}) {
	return (
		<EmptyState className='mx-auto my-auto max-w-md'>
			<EmptyState.Header>
				{icon}
				<EmptyState.Title>{title}</EmptyState.Title>
				<EmptyState.Description>{description}</EmptyState.Description>
			</EmptyState.Header>
			{action ? (
				<EmptyState.Content>
					<ActionTooltip label='新建保存视图'>
						<Button
							aria-label='新建保存视图'
							isIconOnly
							onPress={action}
							size='sm'
							type='button'
							variant='outline'
						>
							<PlusIcon aria-hidden='true' className='size-4' />
						</Button>
					</ActionTooltip>
				</EmptyState.Content>
			) : null}
		</EmptyState>
	)
}

function describeView(view: View) {
	if (view.definitionError) return '需要重建'
	const context =
		view.context.kind === 'standalone'
			? '独立事项'
			: view.context.kind === 'project'
				? '项目'
				: '全部任务'
	return `${context} · ${BASE_VIEW_LABELS[view.baseViewKey]}`
}
