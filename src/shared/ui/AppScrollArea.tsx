import {
	forwardRef,
	useImperativeHandle,
	useRef,
	type ComponentProps,
	type ReactNode,
} from 'react'

import { cn } from '@/shared/lib/utils'

import { OverlayScrollbar } from './OverlayScrollbar'

export type AppScrollAreaProps = {
	className?: string
	viewportClassName?: string
	viewportProps?: Omit<ComponentProps<'div'>, 'children' | 'className' | 'ref'>
	children: ReactNode
	scrollContainerRole?: string
	thumbClassName?: string
	idleThumbClassName?: string
	hoverThumbClassName?: string
	activeThumbClassName?: string
	minThumbHeight?: number
	thumbLengthRatio?: number
	trackInsetTop?: number
	trackInsetBottom?: number
}

/**
 * AppScrollArea 是 StoneFlow 内部统一滚动容器。
 * 它只负责提供稳定的 viewport 协议，并把 OverlayScrollbar 接到真实滚动元素上。
 */
export const AppScrollArea = forwardRef<HTMLDivElement, AppScrollAreaProps>(
	(
		{
			className,
			viewportClassName,
			viewportProps,
			children,
			scrollContainerRole,
			thumbClassName,
			idleThumbClassName,
			hoverThumbClassName,
			activeThumbClassName,
			minThumbHeight,
			thumbLengthRatio,
			trackInsetTop,
			trackInsetBottom,
		},
		forwardedRef,
	) => {
		const viewportRef = useRef<HTMLDivElement>(null)

		useImperativeHandle(forwardedRef, () => viewportRef.current as HTMLDivElement, [])

		return (
			<div className={cn('relative min-h-0', className)}>
				<div
					{...viewportProps}
					className={cn('no-scrollbar min-h-0 overflow-y-auto', viewportClassName)}
					data-scroll-container='true'
					data-scroll-container-role={scrollContainerRole}
					ref={viewportRef}
				>
					{children}
				</div>
				<OverlayScrollbar
					activeThumbClassName={activeThumbClassName}
					hoverThumbClassName={hoverThumbClassName}
					idleThumbClassName={idleThumbClassName}
					minThumbHeight={minThumbHeight}
					scrollRef={viewportRef}
					thumbClassName={thumbClassName}
					thumbLengthRatio={thumbLengthRatio}
					trackInsetBottom={trackInsetBottom}
					trackInsetTop={trackInsetTop}
				/>
			</div>
		)
	},
)

AppScrollArea.displayName = 'AppScrollArea'
