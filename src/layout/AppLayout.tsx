import { ShellBulkActionBoundary } from '@/layout/ShellBulkActionBoundary'
import { ShellProviders } from '@/layout/ShellProviders'
import type { AppLayoutProps } from '@/layout/appLayoutTypes'

export type { AppLayoutProps } from '@/layout/appLayoutTypes'

export function AppLayout({
	children,
	currentScope,
	currentSpaceId,
	activeSection,
	shellRoute,
}: AppLayoutProps) {
	return (
		<ShellProviders>
			<ShellBulkActionBoundary
				activeSection={activeSection}
				currentScope={currentScope}
				currentSpaceId={currentSpaceId}
				shellRoute={shellRoute}
			>
				{children}
			</ShellBulkActionBoundary>
		</ShellProviders>
	)
}
