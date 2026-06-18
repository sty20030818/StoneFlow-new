import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { useState } from 'react'

import { AppProviders } from './providers/AppProviders'
import { createAppQueryClient } from './providers/query'
import { router } from './router'

export function App() {
	const [queryClient] = useState(() => createAppQueryClient())

	return (
		<QueryClientProvider client={queryClient}>
			<AppProviders>
				<RouterProvider context={{ queryClient }} router={router} />
			</AppProviders>
		</QueryClientProvider>
	)
}
