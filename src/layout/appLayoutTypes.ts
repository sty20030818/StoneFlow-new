import type { PropsWithChildren } from 'react'

import type { ShellRoute } from '@/app/navigation/shellRoute'
import type { ShellSectionKey } from '@/layout/types'
import type { Scope } from '@/shared/types'

export type AppLayoutProps = PropsWithChildren<{
	currentScope: Scope
	currentSpaceId: string | null
	activeSection: ShellSectionKey
	shellRoute: ShellRoute
}>
