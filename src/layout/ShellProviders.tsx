import type { ReactNode } from 'react'

import { CommandSelectionProvider } from '@/features/selection/model'
import { PageFilterProvider } from '@/features/filter/model'
import { SubmitRegistryProvider } from '@/features/submit/model'
import { TaskPreviewProvider } from '@/features/task/detail'
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
