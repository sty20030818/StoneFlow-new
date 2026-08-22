/**
 * 命令宿主的页筛选 **投影槽**（非 Filter 领域真源）。
 *
 * - 真源：ListFilterSession（FilterQuery）
 * - 本文件：壳层 / 命令板读取的最小能力与 action port
 * - 打开菜单 / 清除：经 useRegisterFilterCommandAdapter 写回真源
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

export type PageFilterCapabilities = {
	supportsClearAll: boolean
}

export type PageFilterController = {
	capabilities: PageFilterCapabilities
	actions: {
		/** 打开锚定 FilterMenu */
		openFilterMenu: () => void
		clearAll: () => void
	}
}

const EMPTY_CAPABILITIES: PageFilterCapabilities = {
	supportsClearAll: false,
}

const EMPTY_CONTROLLER: PageFilterController = {
	capabilities: EMPTY_CAPABILITIES,
	actions: {
		openFilterMenu: () => {},
		clearAll: () => {},
	},
}

type PageFilterActions = {
	registerController: (token: symbol, controller: PageFilterController) => void
	clearControllerRegistration: (token: symbol) => void
}

const PageFilterContext = createContext<PageFilterController | null>(null)
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
			<PageFilterContext.Provider value={controller}>{children}</PageFilterContext.Provider>
		</PageFilterActionsContext.Provider>
	)
}

export function usePageFilterContext() {
	return useContext(PageFilterContext) ?? EMPTY_CONTROLLER
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
