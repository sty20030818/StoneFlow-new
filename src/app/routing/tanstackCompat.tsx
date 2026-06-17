import { useCallback, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import {
	Link as TanStackLink,
	Navigate as TanStackNavigate,
	Outlet as TanStackOutlet,
} from '@tanstack/react-router'
import {
	Link as ReactRouterLink,
	NavLink as ReactRouterNavLink,
	Navigate as ReactRouterNavigate,
	Outlet as ReactRouterOutlet,
	matchPath,
	UNSAFE_LocationContext as ReactRouterLocationContext,
	useLocation as useReactRouterLocation,
	useNavigate as useReactRouterNavigate,
	useNavigationType as useReactRouterNavigationType,
	useParams as useReactRouterParams,
	useSearchParams as useReactRouterSearchParams,
} from 'react-router-dom'
import { useContext } from 'react'
import { useRouterRuntime } from './routerRuntimeContext'

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

let lastNavigationAction = 'POP'

function useHasReactRouterContext() {
	return useContext(ReactRouterLocationContext) !== null
}

function useTanStackRouter() {
	return useRouterRuntime()
}

export function Outlet() {
	const hasReactRouterContext = useHasReactRouterContext()
	return hasReactRouterContext ? <ReactRouterOutlet /> : <TanStackOutlet />
}

export function Navigate({ replace, to }: CompatNavigateProps) {
	const hasReactRouterContext = useHasReactRouterContext()
	return hasReactRouterContext ? (
		<ReactRouterNavigate replace={replace} to={to} />
	) : (
		<TanStackNavigate replace={replace} to={to as never} />
	)
}

export function Link({ children, className, to }: CompatLinkProps) {
	const hasReactRouterContext = useHasReactRouterContext()
	if (hasReactRouterContext) {
		return (
			<ReactRouterLink className={className} to={to}>
				{children}
			</ReactRouterLink>
		)
	}

	return (
		<TanStackLink from='/' className={className} to={to as never}>
			{children}
		</TanStackLink>
	)
}

export function NavLink({ children, className, to }: CompatNavLinkProps) {
	const hasReactRouterContext = useHasReactRouterContext()
	if (hasReactRouterContext) {
		return (
			<ReactRouterNavLink className={className} to={to}>
				{children}
			</ReactRouterNavLink>
		)
	}

	return (
		<TanStackLink activeProps={{ className }} className={className} from='/' to={to as never}>
			{children}
		</TanStackLink>
	)
}

export function useNavigate() {
	const hasReactRouterContext = useHasReactRouterContext()
	const reactRouterNavigate = useReactRouterNavigate()
	const tanstackRouter = useTanStackRouter()

	return useCallback(
		(to: string | number | CompatLocationTarget, options?: CompatNavigateOptions) => {
			if (hasReactRouterContext) {
				if (typeof to === 'number') {
					reactRouterNavigate(to)
					return
				}

				if (typeof to === 'string') {
					reactRouterNavigate(to, { replace: options?.replace })
					return
				}

				reactRouterNavigate(
					{
						pathname: to.pathname,
						search: to.search,
						hash: to.hash,
					},
					{ replace: options?.replace },
				)
				return
			}

			if (typeof to === 'number') {
				tanstackRouter?.history.go(to)
				return
			}

			if (typeof to === 'string') {
				return tanstackRouter?.navigate({
					replace: options?.replace,
					to: to as never,
				})
			}

			return tanstackRouter?.navigate({
				replace: options?.replace,
				to: to.pathname as never,
				hash: to.hash ? to.hash.replace(/^#/, '') : undefined,
				search: to.search
					? (Object.fromEntries(new URLSearchParams(to.search)) as never)
					: undefined,
			})
		},
		[hasReactRouterContext, reactRouterNavigate, tanstackRouter],
	)
}

export function useParams<TParams extends Record<string, string | undefined>>() {
	const hasReactRouterContext = useHasReactRouterContext()
	const reactRouterParams = useReactRouterParams()
	const tanstackRouter = useTanStackRouter()

	if (hasReactRouterContext) {
		return reactRouterParams as TParams
	}

	const state = tanstackRouter?.state as unknown as {
		matches?: Array<{ params?: TParams }>
	} | null
	const lastMatch = state?.matches?.[state.matches.length - 1]
	return (lastMatch?.params ?? {}) as TParams
}

export function useLocation() {
	const hasReactRouterContext = useHasReactRouterContext()
	const reactRouterLocation = useReactRouterLocation()
	const tanstackRouter = useTanStackRouter()
	const tanstackLocation = tanstackRouter?.state.location

	return useMemo(
		() =>
			hasReactRouterContext
				? {
						pathname: reactRouterLocation.pathname,
						search: reactRouterLocation.search,
						hash: reactRouterLocation.hash,
					}
				: {
						pathname: tanstackLocation?.pathname ?? '/',
						search: tanstackLocation?.searchStr ?? '',
						hash: tanstackLocation?.hash ? `#${tanstackLocation.hash}` : '',
					},
		[
			hasReactRouterContext,
			reactRouterLocation.hash,
			reactRouterLocation.pathname,
			reactRouterLocation.search,
			tanstackLocation?.hash,
			tanstackLocation?.pathname,
			tanstackLocation?.searchStr,
		],
	)
}

export function useSearchParams(): [URLSearchParams, (nextInit: CompatSearchParamsInit) => void] {
	const hasReactRouterContext = useHasReactRouterContext()
	const [reactRouterSearchParams, setReactRouterSearchParams] = useReactRouterSearchParams()
	const tanstackRouter = useTanStackRouter()
	const tanstackLocation = tanstackRouter?.state.location
	const tanstackSearchParams = useMemo(
		() => new URLSearchParams(tanstackLocation?.searchStr ?? ''),
		[tanstackLocation?.searchStr],
	)

	const setSearchParams = useCallback(
		(nextInit: CompatSearchParamsInit) => {
			if (hasReactRouterContext) {
				setReactRouterSearchParams(nextInit, { replace: true })
				return
			}

			void tanstackRouter?.navigate({
				replace: true,
				to: (tanstackLocation?.pathname ?? '/') as never,
				search: nextInit as never,
			})
		},
		[hasReactRouterContext, setReactRouterSearchParams, tanstackLocation?.pathname, tanstackRouter],
	)

	return [hasReactRouterContext ? reactRouterSearchParams : tanstackSearchParams, setSearchParams]
}

export function useNavigationType() {
	const hasReactRouterContext = useHasReactRouterContext()
	const reactRouterNavigationType = useReactRouterNavigationType()
	const tanstackRouter = useTanStackRouter()

	return hasReactRouterContext
		? reactRouterNavigationType
		: useSyncExternalStore(
				(onStoreChange) =>
					tanstackRouter?.history.subscribe(({ action }) => {
						lastNavigationAction = action.type
						onStoreChange()
					}) ?? (() => undefined),
				() => lastNavigationAction,
				() => 'POP',
			)
}

export function useMatch(options: CompatMatchOptions) {
	const hasReactRouterContext = useHasReactRouterContext()
	const reactRouterLocation = useReactRouterLocation()

	if (hasReactRouterContext) {
		return matchPath({ path: options.path, end: options.end }, reactRouterLocation.pathname)
	}

	return matchPath({ path: options.path, end: options.end ?? false }, useLocation().pathname)
}
