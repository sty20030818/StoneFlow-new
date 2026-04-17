import type { PropsWithChildren } from 'react'

import { TooltipProvider } from '@/shared/ui/base/tooltip'

export function AppProviders({ children }: PropsWithChildren) {
  return <TooltipProvider>{children}</TooltipProvider>
}
