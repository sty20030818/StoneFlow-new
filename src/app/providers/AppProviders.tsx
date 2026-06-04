import type { PropsWithChildren } from 'react'

import { QueryProvider } from '@/app/providers/query'
import { Toaster } from '@/shared/ui/base/sonner'
import { TooltipProvider } from '@/shared/ui/base/tooltip'

export function AppProviders({ children }: PropsWithChildren) {
	return (
		<QueryProvider>
			<TooltipProvider>
				{children}
				<Toaster />
			</TooltipProvider>
		</QueryProvider>
	)
}
