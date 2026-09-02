import {
	useCallback,
	createContext,
	forwardRef,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from 'react'
import { mergeRefs } from '@react-aria/utils'

/** 集合页真实滚动 viewport；virtualizer / sticky 通过此 context 获取，禁止 querySelector。 */
const ScrollAreaViewportContext = createContext<HTMLDivElement | null>(null)

export function useScrollAreaViewport(): HTMLDivElement | null {
	return useContext(ScrollAreaViewportContext)
}

type AppScrollAreaProps = {
	children: ReactNode
}

/**
 * AppScrollArea：集合内容的唯一真实滚动 viewport。
 * 通过 ScrollAreaViewportContext 暴露已挂载 viewport，普通与虚拟集合共用同一 inset/overflow 合同。
 */
export const AppScrollArea = forwardRef<HTMLDivElement, AppScrollAreaProps>(
	({ children }, forwardedRef) => {
		const [viewport, setViewport] = useState<HTMLDivElement | null>(null)
		const captureViewport = useCallback((node: HTMLDivElement | null) => setViewport(node), [])
		const viewportRef = useMemo(
			() => mergeRefs(forwardedRef, captureViewport),
			[captureViewport, forwardedRef],
		)

		return (
			<ScrollAreaViewportContext.Provider value={viewport}>
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
