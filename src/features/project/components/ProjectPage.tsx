import { FolderIcon } from 'lucide-react'

import { EntityScene } from '@/features/entity-scene'
import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import { DisplayOptionsButton } from '@/features/display-options'
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

type ProjectPageProps = {
	scopeOverride?: Scope
}

/**
 * 项目详情页：只拼 EntityScene 槽位。
 * wiring 在 {@link useProjectDetailScene}。
 */
export function ProjectPage({ scopeOverride }: ProjectPageProps = {}) {
	const scene = useProjectDetailScene({ scopeOverride })

	return (
		<EntityScene
			board={scene.board}
			breadcrumb={<AppBreadcrumb items={scene.breadcrumbItems} />}
			beforeBoard={
				!scene.project ? (
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
				) : null
			}
			bulkBar={
				scene.project ? (
					<BulkActionBar
						action={<BulkCommandMenuAction />}
						onClear={scene.bulk.clearTaskSelection}
						selectedCount={scene.bulk.selectedCount}
					/>
				) : null
			}
			headerActions={
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
			toolbarDisplayAction={<DisplayOptionsButton pageKey={scene.displayPageKey} />}
			toolbarPills={scene.toolbarPills}
		/>
	)
}
