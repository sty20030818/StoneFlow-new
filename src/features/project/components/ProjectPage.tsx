import { FolderIcon } from 'lucide-react'

import { PageFrame } from '@/shared/components/page-frame'
import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import { DisplayOptionsButton } from '@/features/display-options'
import { FilterBar, ListFilterUiProvider, PageFilterButton } from '@/features/filter'
import type { Scope } from '@/shared/types'
import { Button } from '@/shared/components/base/button'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/components/base/empty'

import { useProjectDetailScene } from '../hooks/useProjectDetailScene'
import { TaskBoard } from '@/features/task'

type ProjectPageProps = {
	scopeOverride?: Scope
}

/**
 * 项目详情页：组合项目头部与任务集合。
 * wiring 在 {@link useProjectDetailScene}。
 */
export function ProjectPage({ scopeOverride }: ProjectPageProps = {}) {
	const scene = useProjectDetailScene({ scopeOverride })

	return (
		<ListFilterUiProvider value={scene.filterUiValue}>
			<PageFrame.Root>
				<PageFrame.Header
					actions={
						scene.project ? (
							<div className='flex items-center gap-2'>
								<Button
									disabled={scene.busyAction !== null}
									onClick={scene.completeOrReopen}
									size='sm'
									variant='outline'
								>
									{scene.project.completedAt ? '重开' : '完成'}
								</Button>
								<Button
									disabled={scene.busyAction !== null}
									onClick={() => void scene.archive()}
									size='sm'
									variant='outline'
								>
									归档
								</Button>
								<Button
									disabled={scene.busyAction !== null}
									onClick={() => void scene.remove()}
									size='sm'
									variant='outline'
								>
									删除
								</Button>
							</div>
						) : null
					}
					breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />}
				/>
				<PageFrame.Toolbar
					displayAction={<DisplayOptionsButton pageKey={scene.displayPageKey} />}
					filterAction={<PageFilterButton />}
					filterBar={<FilterBar />}
					pills={scene.toolbarPills}
				/>
				<PageFrame.Body>
					{!scene.project ? (
						<EmptyPage>
							<Empty>
								<EmptyHeader>
									<EmptyMedia variant='icon'>
										<FolderIcon />
									</EmptyMedia>
									<EmptyTitle>当前项目不可见</EmptyTitle>
									<EmptyDescription>它可能已被归档、删除，或当前 Scope 已切走。</EmptyDescription>
								</EmptyHeader>
								<EmptyContent>
									<Button onClick={scene.goToProjectsOverview} type='button'>
										返回项目总览
									</Button>
								</EmptyContent>
							</Empty>
						</EmptyPage>
					) : (
						<TaskBoard {...scene.taskCollection.boardProps} />
					)}
				</PageFrame.Body>
				{scene.project ? (
					<PageFrame.BulkBar>
						<BulkActionBar
							action={<BulkCommandMenuAction />}
							onClear={scene.bulk.clearTaskSelection}
							selectedCount={scene.bulk.selectedCount}
						/>
					</PageFrame.BulkBar>
				) : null}
			</PageFrame.Root>
		</ListFilterUiProvider>
	)
}
