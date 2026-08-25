import {
	createContext,
	forwardRef,
	useContext,
	useImperativeHandle,
	useRef,
	type ReactNode,
	type RefObject,
} from 'react'

/** 真实滚动 viewport ref；虚拟列表 / sticky 通过此 context 获取，禁止 querySelector */
const ScrollAreaViewportContext = createContext<RefObject<HTMLDivElement | null> | null>(null)

export function useScrollAreaViewport(): RefObject<HTMLDivElement | null> | null {
	return useContext(ScrollAreaViewportContext)
}

type AppScrollAreaProps = {
	children: ReactNode
}

/**
 * AppScrollArea：虚拟内容的唯一真实滚动 viewport。
 * 通过 ScrollAreaViewportContext 暴露 viewport ref（TaskBoard virtualizer 使用）。
 */
export const AppScrollArea = forwardRef<HTMLDivElement, AppScrollAreaProps>(
	({ children }, forwardedRef) => {
		const viewportRef = useRef<HTMLDivElement>(null)

		useImperativeHandle(forwardedRef, () => viewportRef.current as HTMLDivElement, [])

		return (
			<ScrollAreaViewportContext.Provider value={viewportRef}>
				<div className='relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
					<div
						className='scrollbar flex min-h-0 min-w-0 max-h-full flex-1 flex-col overflow-y-auto px-2 pb-2'
						data-scroll-container='true'
						ref={viewportRef}
					>
						{children}
					</div>
				</div>
			</ScrollAreaViewportContext.Provider>
		)
	},
)

AppScrollArea.displayName = 'AppScrollArea'
