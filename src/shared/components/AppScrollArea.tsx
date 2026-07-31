import {
	createContext,
	forwardRef,
	useContext,
	useImperativeHandle,
	useRef,
	type ComponentProps,
	type ReactNode,
	type RefObject,
} from 'react'

import { cn } from '@/shared/lib/utils'

import { OverlayScrollbar } from './OverlayScrollbar'

/** 真实滚动 viewport ref；虚拟列表 / sticky 通过此 context 获取，禁止 querySelector */
const ScrollAreaViewportContext = createContext<RefObject<HTMLDivElement | null> | null>(null)

export function useScrollAreaViewport(): RefObject<HTMLDivElement | null> | null {
	return useContext(ScrollAreaViewportContext)
}

export type AppScrollAreaProps = {
	className?: string
	viewportClassName?: string
	scrollbarClassName?: string
	viewportProps?: Omit<ComponentProps<'div'>, 'children' | 'className' | 'ref'> & {
		'data-testid'?: string
	}
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
 * AppScrollArea：统一滚动容器 + OverlayScrollbar。
 * 通过 ScrollAreaViewportContext 暴露 viewport ref（TaskBoard virtualizer 使用）。
 */
export const AppScrollArea = forwardRef<HTMLDivElement, AppScrollAreaProps>(
	(
		{
			className,
			viewportClassName,
			scrollbarClassName,
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
			<ScrollAreaViewportContext.Provider value={viewportRef}>
				<div className={cn('relative flex min-h-0 flex-col overflow-hidden', className)}>
					<div
						{...viewportProps}
						className={cn(
							'no-scrollbar min-h-0 max-h-full flex-1 overflow-y-auto',
							viewportClassName,
						)}
						data-scroll-container='true'
						data-scroll-container-role={scrollContainerRole}
						ref={viewportRef}
					>
						{children}
					</div>
					<OverlayScrollbar
						activeThumbClassName={activeThumbClassName}
						className={scrollbarClassName}
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
			</ScrollAreaViewportContext.Provider>
		)
	},
)

AppScrollArea.displayName = 'AppScrollArea'
