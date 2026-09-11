import { Button, Popover } from '@heroui/react'
import { EllipsisIcon } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'

export type RowProperty = {
	label: string
	content: ReactNode
}

type RowLayoutProps = {
	selection?: ReactNode
	leading?: ReactNode
	primary: ReactNode
	properties?: readonly RowProperty[]
	timestamp?: RowProperty
	propertiesLabel?: string
	actions?: ReactNode
}

type RowSlotEvent = {
	stopPropagation: () => void
}

function stopRowActivation(event: RowSlotEvent) {
	event.stopPropagation()
}

/** Row 内部唯一排版合同；领域 Adapter 只负责填充真实槽位。 */
export function RowLayout({
	selection,
	leading,
	primary,
	properties = [],
	timestamp,
	propertiesLabel = '属性',
	actions,
}: RowLayoutProps) {
	return (
		<div className='flex min-w-0 flex-1 items-center gap-4' data-row-layout='true'>
			{selection || leading ? (
				<div className='flex shrink-0 items-center gap-4' data-row-layout-region='controls'>
					{selection ? (
						<div
							className='flex size-4 shrink-0 items-center justify-center opacity-0 group-data-[hovered=true]/row-shell:opacity-100 group-data-[selected=true]/row-shell:opacity-100 group-hover/row-shell:opacity-100 group-focus-visible/row-shell:opacity-100 group-has-focus-visible/row-shell:opacity-100'
							data-row-layout-slot='selection'
							onClick={stopRowActivation}
							onKeyDown={stopRowActivation}
							onPointerDown={stopRowActivation}
						>
							{selection}
						</div>
					) : null}
					{leading ? (
						<div
							className='grid auto-cols-4 grid-flow-col items-center justify-items-center gap-4'
							data-row-layout-slot='leading'
						>
							{leading}
						</div>
					) : null}
				</div>
			) : null}
			<div className='min-w-0 flex-1 overflow-hidden' data-row-layout-slot='primary'>
				{primary}
			</div>
			{properties.length || timestamp ? (
				<div
					className='shrink-0 text-xs text-muted'
					data-row-layout-slot='properties'
					onClick={stopRowActivation}
					onKeyDown={stopRowActivation}
					onPointerDown={stopRowActivation}
				>
					<RowProperties label={propertiesLabel} properties={properties} timestamp={timestamp} />
				</div>
			) : null}
			{actions ? (
				<div
					className='flex shrink-0 items-center gap-0.5 opacity-0 group-data-[hovered=true]/row-shell:opacity-100 group-hover/row-shell:opacity-100 group-focus-visible/row-shell:opacity-100 group-has-focus-visible/row-shell:opacity-100'
					data-row-layout-slot='actions'
					onClick={stopRowActivation}
					onKeyDown={stopRowActivation}
					onPointerDown={stopRowActivation}
				>
					{actions}
				</div>
			) : null}
		</div>
	)
}

/** 两档布局共用领域内容；浮层按需挂载，宽度切换只由 CSS 容器查询负责。 */
function RowProperties({
	label,
	properties,
	timestamp,
}: {
	label: string
	properties: readonly RowProperty[]
	timestamp?: RowProperty
}) {
	const allProperties = timestamp ? [...properties, timestamp] : properties
	return (
		<div className='flex items-center gap-2'>
			<div className='hidden items-center gap-4 whitespace-nowrap @min-[560px]/row:flex'>
				{properties.length ? (
					<div className='flex items-center gap-2' data-row-layout-region='fields'>
						{properties.map((property) => (
							<div className='flex shrink-0 items-center' key={property.label}>
								{property.content}
							</div>
						))}
					</div>
				) : null}
				{timestamp ? (
					<div
						className='w-8 shrink-0 truncate text-right tabular-nums'
						data-row-layout-slot='timestamp'
					>
						{timestamp.content}
					</div>
				) : null}
			</div>
			<div className='@min-[560px]/row:sr-only @min-[560px]/row:focus-within:not-sr-only @min-[560px]/row:has-aria-expanded:not-sr-only'>
				<Popover>
					<Button aria-label={`查看${label}`} isIconOnly size='sm' variant='ghost'>
						<EllipsisIcon aria-hidden />
					</Button>
					<Popover.Content className='max-w-[calc(100vw-24px)]' placement='bottom end'>
						<Popover.Dialog aria-label={label}>
							<dl className='grid min-w-48 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1'>
								{allProperties.map((property) => (
									<Fragment key={property.label}>
										<dt className='text-xs text-muted'>{property.label}</dt>
										<dd className='flex min-w-0 items-center justify-end text-xs'>
											{property.content}
										</dd>
									</Fragment>
								))}
							</dl>
						</Popover.Dialog>
					</Popover.Content>
				</Popover>
			</div>
		</div>
	)
}
