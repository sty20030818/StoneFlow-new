import type { PropsWithChildren } from 'react'

import { Toaster } from '@/shared/components/base/sonner'
import { TooltipProvider } from '@/shared/components/base/tooltip'

export function AppProviders({ children }: PropsWithChildren) {
	return (
		<TooltipProvider>
			{children}
			<Toaster />
		</TooltipProvider>
	)
}
