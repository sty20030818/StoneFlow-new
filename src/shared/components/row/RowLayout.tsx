import type { ReactNode } from 'react'

type RowLayoutProps = {
	selection?: ReactNode
	leading?: ReactNode
	primary: ReactNode
	properties?: ReactNode
	actions?: ReactNode
}

type RowSlotEvent = {
	stopPropagation: () => void
}

function stopRowActivation(event: RowSlotEvent) {
	event.stopPropagation()
}

/** Row 内部唯一排版合同；领域 Adapter 只负责填充真实槽位。 */
export function RowLayout({ selection, leading, primary, properties, actions }: RowLayoutProps) {
	return (
		<div className='flex min-w-0 flex-1 items-center gap-3' data-row-layout='true'>
			{selection ? (
				<div
					className='flex size-5 shrink-0 items-center justify-center opacity-0 group-data-[hovered=true]/row-shell:opacity-100 group-data-[selected=true]/row-shell:opacity-100 group-hover/row-shell:opacity-100 group-focus-visible/row-shell:opacity-100 group-has-focus-visible/row-shell:opacity-100'
					data-row-layout-slot='selection'
					onClick={stopRowActivation}
					onKeyDown={stopRowActivation}
					onPointerDown={stopRowActivation}
				>
					{selection}
				</div>
			) : null}
			{leading ? (
				<div className='flex shrink-0 items-center gap-1' data-row-layout-slot='leading'>
					{leading}
				</div>
			) : null}
			<div className='min-w-0 flex-1 overflow-hidden' data-row-layout-slot='primary'>
				{primary}
			</div>
			{properties ? (
				<div
					className='hidden shrink-0 items-center gap-2 text-xs text-muted @min-[560px]/row:flex'
					data-row-layout-slot='properties'
				>
					{properties}
				</div>
			) : null}
			{actions ? (
				<div
					className='flex shrink-0 items-center opacity-0 group-data-[hovered=true]/row-shell:opacity-100 group-hover/row-shell:opacity-100 group-focus-visible/row-shell:opacity-100 group-has-focus-visible/row-shell:opacity-100'
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
