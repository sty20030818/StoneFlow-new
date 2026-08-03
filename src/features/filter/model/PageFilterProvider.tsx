/**
 * 命令宿主的页筛选 **投影槽**（非 Filter 领域真源）。
 *
 * - 真源：ListFilterSession（FilterQuery）+ Display.showCompleted
 * - 本文件：壳层 / 命令板读取的最小投影（启用态、完成可见、能力位）
 * - 打开菜单 / 清除 / 切换完成：经 useRegisterFilterCommandAdapter 写回真源
 */
import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type PropsWithChildren,
} from 'react'

/** 命令/快捷键所需的最小投影；勿当作第二套筛选状态 */
export type PageFilterState = {
	hasActiveFilters: boolean
	showCompleted: boolean
}

export type PageFilterCapabilities = {
	supportsToggleCompleted: boolean
	supportsClearAll: boolean
}

export type PageFilterController = {
	state: PageFilterState
	capabilities: PageFilterCapabilities
	actions: {
		/** 打开锚定 FilterMenu */
		openFilterMenu: () => void
		toggleCompleted: () => void
		clearAll: () => void
	}
}

const EMPTY_CAPABILITIES: PageFilterCapabilities = {
	supportsToggleCompleted: false,
	supportsClearAll: false,
}

const EMPTY_STATE: PageFilterState = {
	hasActiveFilters: false,
	showCompleted: true,
}

const EMPTY_CONTROLLER: PageFilterController = {
	state: EMPTY_STATE,
	capabilities: EMPTY_CAPABILITIES,
	actions: {
		openFilterMenu: () => {},
		toggleCompleted: () => {},
		clearAll: () => {},
	},
}

type PageFilterActions = {
	registerController: (token: symbol, controller: PageFilterController) => void
	clearControllerRegistration: (token: symbol) => void
}

const PageFilterStateContext = createContext<PageFilterController | null>(null)
const PageFilterActionsContext = createContext<PageFilterActions | null>(null)

export function PageFilterProvider({ children }: PropsWithChildren) {
	const [controller, setController] = useState<PageFilterController>(EMPTY_CONTROLLER)
	const activeTokenRef = useRef<symbol | null>(null)

	const actions = useMemo<PageFilterActions>(
		() => ({
			registerController: (token, nextController) => {
				activeTokenRef.current = token
				setController(nextController)
			},
			clearControllerRegistration: (token) => {
				if (activeTokenRef.current !== token) {
					return
				}

				activeTokenRef.current = null
				setController(EMPTY_CONTROLLER)
			},
		}),
		[],
	)

	return (
		<PageFilterActionsContext.Provider value={actions}>
			<PageFilterStateContext.Provider value={controller}>
				{children}
			</PageFilterStateContext.Provider>
		</PageFilterActionsContext.Provider>
	)
}

export function usePageFilterContext() {
	return useContext(PageFilterStateContext) ?? EMPTY_CONTROLLER
}

export function useRegisterPageFilterController(controller: PageFilterController) {
	const actions = useContext(PageFilterActionsContext)
	const [token] = useState(() => Symbol('page-filter-registration'))

	useEffect(() => {
		if (!actions) {
			return
		}

		actions.registerController(token, controller)
		return () => {
			actions.clearControllerRegistration(token)
		}
	}, [actions, controller, token])
}
