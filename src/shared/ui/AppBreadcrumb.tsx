import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/shared/ui/base/breadcrumb'
import {
	breadcrumbLeadClass,
	breadcrumbLeadForegroundClass,
	breadcrumbLeadIconClass,
} from '@/shared/ui/patterns/breadcrumb'
import { cn } from '@/shared/lib/utils'

export type BreadcrumbNode = {
	key: string
	label: string
	to?: string
	icon?: LucideIcon
	current?: boolean
	truncate?: boolean
}

type AppBreadcrumbProps = {
	items: BreadcrumbNode[]
}

export function AppBreadcrumb({ items }: AppBreadcrumbProps) {
	if (items.length === 0) {
		return null
	}

	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm leading-5'>
				{items.map((item, index) => {
					const Icon = item.icon
					const isCurrent = item.current ?? index === items.length - 1
					const labelClassName = cn(
						index === 0
							? breadcrumbLeadForegroundClass
							: `${breadcrumbLeadClass} text-sf-text-tertiary`,
						'h-5 items-center leading-none',
						item.truncate ? 'min-w-0 truncate' : null,
						isCurrent ? 'font-semibold text-foreground' : null,
					)

					return (
						<BreadcrumbNodeItem
							icon={Icon}
							isCurrent={isCurrent}
							key={item.key}
							label={item.label}
							labelClassName={labelClassName}
							to={item.to}
							truncate={item.truncate ?? index > 0}
						>
							{index > 0 ? <BreadcrumbSeparator /> : null}
						</BreadcrumbNodeItem>
					)
				})}
			</BreadcrumbList>
		</Breadcrumb>
	)
}

type BreadcrumbNodeItemProps = {
	children?: ReactNode
	icon?: LucideIcon
	isCurrent: boolean
	label: string
	labelClassName: string
	to?: string
	truncate: boolean
}

function BreadcrumbNodeItem({
	children,
	icon: Icon,
	isCurrent,
	label,
	labelClassName,
	to,
	truncate,
}: BreadcrumbNodeItemProps) {
	return (
		<>
			{children}
			<BreadcrumbItem className={truncate ? 'min-w-0' : undefined}>
				{isCurrent || !to ? (
					<BreadcrumbPage className={labelClassName}>
						{Icon ? <Icon aria-hidden className={breadcrumbLeadIconClass} /> : null}
						{label}
					</BreadcrumbPage>
				) : (
					<BreadcrumbLink asChild className={labelClassName}>
						<Link to={to}>
							{Icon ? <Icon aria-hidden className={breadcrumbLeadIconClass} /> : null}
							{label}
						</Link>
					</BreadcrumbLink>
				)}
			</BreadcrumbItem>
		</>
	)
}
