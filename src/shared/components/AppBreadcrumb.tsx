import type { LucideIcon } from 'lucide-react'
import { ChevronRightIcon } from 'lucide-react'
import { Breadcrumbs } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { Breadcrumb } from 'react-aria-components'

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
	if (items.length === 0) return null

	return (
		<Breadcrumbs aria-label='当前位置'>
			{items.map((item, index) => (
				<BreadcrumbNodeItem
					icon={item.icon}
					isCurrent={item.current ?? index === items.length - 1}
					key={item.key}
					label={item.label}
					showSeparator={index > 0}
					to={item.to}
					truncate={item.truncate ?? index > 0}
				/>
			))}
		</Breadcrumbs>
	)
}

function BreadcrumbNodeItem({
	icon: Icon,
	isCurrent,
	label,
	showSeparator,
	to,
	truncate,
}: {
	icon?: LucideIcon
	isCurrent: boolean
	label: string
	showSeparator: boolean
	to?: string
	truncate: boolean
}) {
	const labelNode = truncate ? (
		<OverflowTooltip className='min-w-0 flex-1' content={label}>
			{label}
		</OverflowTooltip>
	) : (
		label
	)
	const content = (
		<>
			{Icon ? <Icon aria-hidden className='size-4 shrink-0' /> : null}
			{labelNode}
		</>
	)
	const className = cn(
		'breadcrumbs__link inline-flex h-5 items-center gap-1 leading-5',
		truncate ? 'min-w-0 max-w-full' : null,
		isCurrent ? 'font-semibold' : null,
	)

	return (
		<Breadcrumb className={cn('breadcrumbs__item', truncate ? 'min-w-0' : null)}>
			{showSeparator ? <ChevronRightIcon aria-hidden className='breadcrumbs__separator' /> : null}
			{isCurrent || !to ? (
				<span
					aria-current={isCurrent ? 'page' : undefined}
					aria-disabled={isCurrent ? true : undefined}
					className={className}
					data-current={isCurrent}
					role={isCurrent ? 'link' : undefined}
				>
					{content}
				</span>
			) : (
				<Link className={className} from='/' to={to as never}>
					{content}
				</Link>
			)}
		</Breadcrumb>
	)
}
