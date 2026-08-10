import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	Outlet,
	RouterContextProvider,
	RouterProvider,
	createMemoryHistory,
	createRootRouteWithContext,
	createRoute,
	createRouter,
} from '@tanstack/react-router'
import { act, render } from '@testing-library/react'
import type { ReactNode } from 'react'

import { TestInteractionProviders } from './TestInteractionProviders'

type TestRouterContext = {
	queryClient: QueryClient
}

type BaseOptions = {
	initialEntry?: string
	wrap?: (children: ReactNode) => ReactNode
}

type MatchedRouteOptions = BaseOptions & {
	path: string
}

function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	})
}

function createBaseRouter(queryClient: QueryClient) {
	const rootRoute = createRootRouteWithContext<TestRouterContext>()({
		component: () => <Outlet />,
	})

	return {
		rootRoute,
		router: createRouter({
			routeTree: rootRoute,
			history: createMemoryHistory({
				initialEntries: ['/'],
			}),
			context: {
				queryClient,
			},
			defaultNotFoundComponent: () => null,
		}),
	}
}

export async function renderWithRouterContext(node: ReactNode, options: BaseOptions = {}) {
	const queryClient = createTestQueryClient()
	const { router } = createBaseRouter(queryClient)

	if (options.initialEntry) {
		router.history.push(options.initialEntry)
	}

	function renderNode(nextNode: ReactNode) {
		const content = (
			<QueryClientProvider client={queryClient}>
				<RouterContextProvider context={{ queryClient }} router={router}>
					{nextNode}
				</RouterContextProvider>
			</QueryClientProvider>
		)

		const wrappedContent = options.wrap ? options.wrap(content) : content
		return <TestInteractionProviders>{wrappedContent}</TestInteractionProviders>
	}

	const rendered = render(renderNode(node))

	await act(async () => {
		await router.load()
	})

	return {
		router,
		queryClient,
		...rendered,
		rerender: async (nextNode: ReactNode) => {
			rendered.rerender(renderNode(nextNode))

			await act(async () => {
				await router.load()
			})
		},
	}
}

export async function renderWithMatchedRoute(node: ReactNode, options: MatchedRouteOptions) {
	const queryClient = createTestQueryClient()
	let currentNode = node
	const rootRoute = createRootRouteWithContext<TestRouterContext>()({
		component: () => <Outlet />,
	})
	const childRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: options.path.replace(/^\//, '') || '/',
		component: () => <>{currentNode}</>,
	})
	const router = createRouter({
		routeTree: rootRoute.addChildren([childRoute]),
		history: createMemoryHistory({
			initialEntries: [options.initialEntry ?? '/'],
		}),
		context: {
			queryClient,
		},
		defaultNotFoundComponent: () => null,
	})

	function renderNode() {
		const content = (
			<QueryClientProvider client={queryClient}>
				<RouterProvider context={{ queryClient }} router={router} />
			</QueryClientProvider>
		)
		const wrappedContent = options.wrap ? options.wrap(content) : content
		return <TestInteractionProviders>{wrappedContent}</TestInteractionProviders>
	}

	const rendered = render(renderNode())

	await act(async () => {
		await router.load()
	})

	return {
		router,
		queryClient,
		...rendered,
		rerender: async (nextNode: ReactNode) => {
			currentNode = nextNode
			rendered.rerender(renderNode())

			await act(async () => {
				await router.load()
			})
		},
	}
}
