import type { PropsWithChildren } from 'react'

import type { ShellRoute } from '@/app/navigation/shellRoute'
import type { ShellSectionKey } from '@/app/layouts/shell/types'
import type { Scope } from '@/shared/types'

export type ShellLayoutProps = PropsWithChildren<{
	currentScope: Scope
	currentSpaceId: string | null
	activeSection: ShellSectionKey
	shellRoute: ShellRoute
}>
