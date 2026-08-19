import { FolderIcon } from 'lucide-react'
import { Button } from '@heroui/react'
import { EmptyState } from '@heroui-pro/react'

import { PageFrame } from '@/shared/components/page-frame'
import { DisplayOptionsButton } from '@/features/display-options'
import { FilterBar, ListFilterUiProvider, PageFilterButton } from '@/features/filter'
import type { Scope } from '@/shared/types'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'

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
									isDisabled={scene.busyAction !== null}
									size='sm'
									variant='outline'
									onPress={scene.completeOrReopen}
								>
									{scene.project.completedAt ? '重开' : '完成'}
								</Button>
								<Button
									isDisabled={scene.busyAction !== null}
									size='sm'
									variant='outline'
									onPress={() => void scene.archive()}
								>
									归档
								</Button>
								<Button
									isDisabled={scene.busyAction !== null}
									size='sm'
									variant='outline'
									onPress={() => void scene.remove()}
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
				{!scene.project ? (
					<PageFrame.Body>
						<EmptyState className='mx-auto my-auto max-w-md'>
							<EmptyState.Header>
								<FolderIcon />
								<EmptyState.Title>当前项目不可见</EmptyState.Title>
								<EmptyState.Description>
									它可能已被归档、删除，或当前 Scope 已切走。
								</EmptyState.Description>
							</EmptyState.Header>
							<EmptyState.Content>
								<Button onPress={scene.goToProjectsOverview}>返回项目总览</Button>
							</EmptyState.Content>
						</EmptyState>
					</PageFrame.Body>
				) : (
					<PageFrame.VirtualizedBody>
						<TaskBoard {...scene.taskCollection.boardProps} />
					</PageFrame.VirtualizedBody>
				)}
			</PageFrame.Root>
		</ListFilterUiProvider>
	)
}
