import { ShellBulkActionBoundary } from '@/app/layouts/shell/ShellBulkActionBoundary'
import { ShellProviders } from '@/app/layouts/shell/ShellProviders'
import type { ShellLayoutProps } from '@/app/layouts/shell/shellLayoutTypes'

export type { ShellLayoutProps } from '@/app/layouts/shell/shellLayoutTypes'

export function ShellLayout({
	children,
	currentScope,
	currentSpaceId,
	activeSection,
	shellRoute,
}: ShellLayoutProps) {
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
