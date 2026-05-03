import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { MainCardHeader, MainCardLayout } from '@/app/layouts/main-card/MainCardLayout'
import { Button } from '@/shared/ui/base/button'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import type { LucideIcon } from 'lucide-react'

type ShellPlaceholderPageProps = {
	title: string
	description: string
	icon: LucideIcon
	backTo: string
	backLabel?: string
	headerBreadcrumb?: ReactNode
}

/**
 * 阶段 3 的占位页统一骨架：只承接导航与主内容区，不提前塞真实业务逻辑。
 */
export function ShellPlaceholderPage({
	title,
	description,
	icon: Icon,
	backTo,
	backLabel = '返回收件箱',
	headerBreadcrumb,
}: ShellPlaceholderPageProps) {
	const header = headerBreadcrumb ?? (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<BreadcrumbPage className='inline-flex items-center gap-1.5'>
						<Icon aria-hidden className='size-4 shrink-0 text-(--sf-color-text-tertiary)' />
						{title}
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)

	return (
		<MainCardLayout header={<MainCardHeader breadcrumb={header} />} toolbar={null}>
			<EmptyPage>
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<Icon />
						</EmptyMedia>
						<EmptyTitle>{title}</EmptyTitle>
						<EmptyDescription>{description}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button asChild>
							<Link to={backTo}>{backLabel}</Link>
						</Button>
					</EmptyContent>
				</Empty>
			</EmptyPage>
		</MainCardLayout>
	)
}
