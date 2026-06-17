import type { PropsWithChildren } from 'react'

import { Toaster } from '@/shared/ui/base/sonner'
import { TooltipProvider } from '@/shared/ui/base/tooltip'

export function AppProviders({ children }: PropsWithChildren) {
	return (
		<TooltipProvider>
			{children}
			<Toaster />
		</TooltipProvider>
	)
}
