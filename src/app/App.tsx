import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { useState } from 'react'

import { AppProviders } from './providers/AppProviders'
import { createAppQueryClient } from './providers/query'
import { router } from './router'
import { RouterRuntimeProvider } from './routing/routerRuntimeContext'

export function App() {
	const [queryClient] = useState(() => createAppQueryClient())

	return (
		<QueryClientProvider client={queryClient}>
			<AppProviders>
				<RouterRuntimeProvider router={router}>
					<RouterProvider context={{ queryClient }} router={router} />
				</RouterRuntimeProvider>
			</AppProviders>
		</QueryClientProvider>
	)
}
