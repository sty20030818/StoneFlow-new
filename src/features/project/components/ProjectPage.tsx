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

import { TaskBoard } from '@/features/task'
import { TaskWorkspace } from '@/features/task-workspace'
import type { Scope } from '@/shared/types'
import { AppBreadcrumb } from '@/shared/components/AppBreadcrumb'
import { PageFrame } from '@/shared/components/page-frame'
import { ActionTooltip } from '@/shared/components/tooltip'

import { useProjectDetailScene } from '../hooks/useProjectDetailScene'

type ProjectPageProps = {
	scopeOverride?: Scope
}

/**
 * 项目详情页：组合项目头部与任务集合。
 * wiring 在 {@link useProjectDetailScene}。
 */
export function ProjectPage({ scopeOverride }: ProjectPageProps = {}) {
	const scene = useProjectDetailScene({ scopeOverride })

	if (!scene.project) {
		return (
			<PageFrame.Root>
				<PageFrame.Header breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />} />
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
			</PageFrame.Root>
		)
	}

	return (
		<TaskWorkspace
			breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />}
			displayPageKey={scene.displayPageKey}
			filterUiValue={scene.filterUiValue}
			headerActions={
				<div className='flex items-center gap-1.5'>
					<ActionTooltip label={scene.project.completedAt ? '重开项目' : '完成项目'}>
						<Button
							aria-label={scene.project.completedAt ? '重开项目' : '完成项目'}
							isDisabled={scene.busyAction !== null}
							isIconOnly
							onPress={scene.completeOrReopen}
							size='sm'
							type='button'
							variant='secondary'
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
			}
			onViewChange={scene.selectToolbar}
			selectedViewKey={scene.selectedToolbarKey}
			views={scene.toolbarPills}
		>
			<TaskBoard {...scene.taskCollection.boardProps} />
		</TaskWorkspace>
	)
}
