import {
	ArchiveIcon,
	CircleCheckIcon,
	EllipsisIcon,
	FolderIcon,
	RotateCcwIcon,
	Trash2Icon,
} from 'lucide-react'
import { Button, Dropdown } from '@heroui/react'
import { EmptyState } from '@heroui-pro/react'

import { PageFrame } from '@/shared/components/page-frame'
import { DisplayOptionsButton } from '@/features/display-options'
import { FilterBar, ListFilterUiProvider, PageFilterButton } from '@/features/filter'
import type { Scope } from '@/shared/types'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { ActionTooltip } from '@/shared/components/tooltip'

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
							<div className='flex items-center gap-1.5'>
								<ActionTooltip label={scene.project.completedAt ? '重开项目' : '完成项目'}>
									<Button
										aria-label={scene.project.completedAt ? '重开项目' : '完成项目'}
										isDisabled={scene.busyAction !== null}
										isIconOnly
										size='sm'
										type='button'
										variant='secondary'
										onPress={scene.completeOrReopen}
									>
										{scene.project.completedAt ? (
											<RotateCcwIcon aria-hidden='true' className='size-4' />
										) : (
											<CircleCheckIcon aria-hidden='true' className='size-4' />
										)}
									</Button>
								</ActionTooltip>
								<Dropdown>
									<ActionTooltip label='项目操作'>
										<Button
											aria-label='项目操作'
											isDisabled={scene.busyAction !== null}
											isIconOnly
											size='sm'
											type='button'
											variant='outline'
										>
											<EllipsisIcon aria-hidden='true' className='size-4' />
										</Button>
									</ActionTooltip>
									<Dropdown.Popover placement='bottom end'>
										<Dropdown.Menu aria-label='项目操作'>
											<Dropdown.Item
												id='archive-project'
												onAction={() => void scene.archive()}
												textValue='归档项目'
											>
												<ArchiveIcon />
												归档项目
											</Dropdown.Item>
											<Dropdown.Item
												id='delete-project'
												onAction={() => void scene.remove()}
												textValue='删除项目'
												variant='danger'
											>
												<Trash2Icon />
												删除项目
											</Dropdown.Item>
										</Dropdown.Menu>
									</Dropdown.Popover>
								</Dropdown>
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
