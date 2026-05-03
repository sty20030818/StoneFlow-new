import { Link } from 'react-router-dom'

import { buildScopedSectionPath } from '@/app/layouts/shell/config'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { Button } from '@/shared/ui/base/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import {
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import { Trash2Icon } from 'lucide-react'

// TODO: 接入真实 Trash API（后端需要 list_deleted_entities 命令）
// 当前为空壳，等待后续阶段实现回收站数据拉取与恢复逻辑。

export function TrashPage() {
	const { scope, spaceId } = useScopeRoute()

	return (
		<MainCardLayout
			header={<MainCardHeader breadcrumb={<TrashBreadcrumb />} />}
			toolbar={
				<MainCardToolbar
					pills={[
						{ label: '全部已删除', active: true },
						{ label: '任务' },
						{ label: '项目' },
					]}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col'>
				<EmptyPage>
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant='icon'>
								<Trash2Icon />
							</EmptyMedia>
							<EmptyTitle>回收站为空</EmptyTitle>
							<EmptyDescription>删除后的 Task 和 Project 会在这里等待恢复。</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button asChild>
								<Link to={buildScopedSectionPath(scope, 'inbox', spaceId)}>返回收件箱</Link>
							</Button>
						</EmptyContent>
					</Empty>
				</EmptyPage>
			</div>
		</MainCardLayout>
	)
}

function TrashBreadcrumb() {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<BreadcrumbPage className='inline-flex items-center gap-1.5'>
						<Trash2Icon aria-hidden className='size-4 shrink-0 text-(--sf-color-text-tertiary)' />
						回收站
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}
