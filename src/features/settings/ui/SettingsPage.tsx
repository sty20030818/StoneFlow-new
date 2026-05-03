import { Link } from 'react-router-dom'

import { buildScopedSectionPath } from '@/app/layouts/shell/config'
import { MainCardHeader, MainCardLayout } from '@/app/layouts/main-card/MainCardLayout'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
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
import { Settings2Icon } from 'lucide-react'

/**
 * Shell 内的设置占位页，先承接路由与主内容区域，后续再拆分具体设置模块。
 */
export function SettingsPage() {
	const { scope, spaceId } = useScopeRoute()

	return (
		<MainCardLayout
			header={
				<MainCardHeader
					breadcrumb={
						<Breadcrumb>
							<BreadcrumbList className='text-sm font-semibold leading-5'>
								<BreadcrumbItem>
									<BreadcrumbPage className='inline-flex items-center gap-1.5'>
										<Settings2Icon aria-hidden className='size-4 shrink-0 text-(--sf-color-text-tertiary)' />
										设置
									</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					}
				/>
			}
			toolbar={null}
		>
			<EmptyPage>
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<Settings2Icon />
						</EmptyMedia>
						<EmptyTitle>设置功能建设中</EmptyTitle>
						<EmptyDescription>这里会承接账户、外观、快捷键和工作区偏好等设置项。</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild>
							<Link to={buildScopedSectionPath(scope, 'inbox', spaceId)}>返回收件箱</Link>
						</Button>
					</EmptyContent>
				</Empty>
			</EmptyPage>
		</MainCardLayout>
	)
}
