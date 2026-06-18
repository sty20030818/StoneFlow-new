import {
	Link as TanStackLink,
	Navigate as TanStackNavigate,
	Outlet as TanStackOutlet,
	useLocation as useTanStackLocation,
	useMatchRoute,
	useNavigate as useTanStackNavigate,
	useParams as useTanStackParams,
	useRouter,
	useRouterState,
} from '@tanstack/react-router'
import { useCallback, useMemo, useSyncExternalStore, type ReactNode } from 'react'

/**
 * 过渡期路由兼容层。
 * 这里只承接旧调用点仍在使用的最小 API 形状，新的 route file / route-private 代码应优先直接使用 TanStack Router 官方 API。
 */
type CompatNavigateOptions = {
	replace?: boolean
}

type CompatLocationTarget = {
	pathname: string
	search?: string
	hash?: string
}

type CompatLinkProps = {
	children: ReactNode
	className?: string
	to: string
}

type CompatNavLinkProps = CompatLinkProps

type CompatSearchParamsInit = Record<string, string>

type CompatMatchOptions = {
	end?: boolean
	path: string
}

type CompatNavigateProps = {
	replace?: boolean
	to: string
}

type RouterLocationShape = {
	pathname: string
	search: string
	hash: string
}

let lastNavigationAction = 'POP'

export function Outlet() {
	return <TanStackOutlet />
}

export function Navigate({ replace, to }: CompatNavigateProps) {
	return <TanStackNavigate replace={replace} to={to as never} />
}

export function Link({ children, className, to }: CompatLinkProps) {
	return (
		<TanStackLink className={className} from='/' to={to as never}>
			{children}
		</TanStackLink>
	)
}

export function NavLink({ children, className, to }: CompatNavLinkProps) {
	return (
		<TanStackLink activeProps={{ className }} className={className} from='/' to={to as never}>
			{children}
		</TanStackLink>
	)
}

export function useNavigate() {
	const navigate = useTanStackNavigate({ from: '/' })
	const router = useRouter()

	return useCallback(
		(to: string | number | CompatLocationTarget, options?: CompatNavigateOptions) => {
			if (typeof to === 'number') {
				router.history.go(to)
				return
			}

			if (typeof to === 'string') {
				return navigate({
					replace: options?.replace,
					to: to as never,
				})
			}

			return navigate({
				replace: options?.replace,
				to: to.pathname as never,
				hash: to.hash ? to.hash.replace(/^#/, '') : undefined,
				search: to.search
					? (Object.fromEntries(new URLSearchParams(to.search)) as never)
					: undefined,
			})
		},
		[navigate, router.history],
	)
}

export function useParams<TParams extends Record<string, string | undefined>>() {
	return useTanStackParams({ strict: false } as never) as TParams
}

export function useLocation(): RouterLocationShape {
	const location = useTanStackLocation()

	return useMemo(
		() => ({
			pathname: location.pathname,
			search: location.searchStr,
			hash: location.hash ? `#${location.hash}` : '',
		}),
		[location.hash, location.pathname, location.searchStr],
	)
}

export function useSearchParams(): [URLSearchParams, (nextInit: CompatSearchParamsInit) => void] {
	const navigate = useTanStackNavigate({ from: '/' })
	const location = useTanStackLocation()
	const searchParams = useMemo(() => new URLSearchParams(location.searchStr), [location.searchStr])

	const setSearchParams = useCallback(
		(nextInit: CompatSearchParamsInit) => {
			void navigate({
				replace: true,
				to: location.pathname as never,
				search: nextInit as never,
			})
		},
		[location.pathname, navigate],
	)

	return [searchParams, setSearchParams]
}

export function useNavigationType() {
	const router = useRouter()

	return useSyncExternalStore(
		(onStoreChange) =>
			router.history.subscribe(({ action }) => {
				lastNavigationAction = action.type
				onStoreChange()
			}),
		() => lastNavigationAction,
		() => 'POP',
	)
}

export function useMatch(options: CompatMatchOptions) {
	const matchRoute = useMatchRoute()
	const routerState = useRouterState()

	return (
		matchRoute({
			fuzzy: options.end === false,
			to: options.path as never,
			pending: false,
		}) ??
		(options.end === false && routerState.location.pathname.startsWith(options.path) ? {} : false)
	)
}
