import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/shared/components/base/breadcrumb'
import {
	breadcrumbLeadClass,
	breadcrumbLeadForegroundClass,
	breadcrumbLeadIconClass,
} from '@/shared/components/patterns/breadcrumb'
import { OverflowTooltip } from '@/shared/components/tooltip'
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
					const shouldTruncate = item.truncate ?? index > 0
					const labelClassName = cn(
						index === 0
							? breadcrumbLeadForegroundClass
							: `${breadcrumbLeadClass} text-sf-text-tertiary`,
						'h-5 items-center leading-none',
						shouldTruncate ? 'min-w-0 max-w-full' : null,
						isCurrent ? 'font-semibold text-legacy-foreground' : null,
					)

					return (
						<BreadcrumbNodeItem
							icon={Icon}
							isCurrent={isCurrent}
							key={item.key}
							label={item.label}
							labelClassName={labelClassName}
							to={item.to}
							truncate={shouldTruncate}
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
	const labelNode = truncate ? (
		<OverflowTooltip className='min-w-0 flex-1' content={label}>
			{label}
		</OverflowTooltip>
	) : (
		label
	)

	return (
		<>
			{children}
			<BreadcrumbItem className={truncate ? 'min-w-0' : undefined}>
				{isCurrent || !to ? (
					<BreadcrumbPage className={labelClassName}>
						{Icon ? <Icon aria-hidden className={breadcrumbLeadIconClass} /> : null}
						{labelNode}
					</BreadcrumbPage>
				) : (
					<BreadcrumbLink asChild className={labelClassName}>
						<Link from='/' to={to as never}>
							{Icon ? <Icon aria-hidden className={breadcrumbLeadIconClass} /> : null}
							{labelNode}
						</Link>
					</BreadcrumbLink>
				)}
			</BreadcrumbItem>
		</>
	)
}
