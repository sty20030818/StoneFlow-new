import type { ReactNode } from 'react'

import { CommandSelectionProvider } from '@/features/selection'
import { PageFilterProvider } from '@/features/filter'
import { SubmitRegistryProvider } from '@/features/submit'
import { TaskPreviewProvider } from '@/features/task'
import { DangerConfirmProvider } from '@/features/danger-confirm'

export function ShellProviders({ children }: { children: ReactNode }) {
	return (
		<CommandSelectionProvider>
			<SubmitRegistryProvider>
				<PageFilterProvider>
					<DangerConfirmProvider>
						<TaskPreviewProvider>{children}</TaskPreviewProvider>
					</DangerConfirmProvider>
				</PageFilterProvider>
			</SubmitRegistryProvider>
		</CommandSelectionProvider>
	)
}
