import type { ReactNode } from 'react'

import { CommandSelectionProvider } from '@/features/selection'
import { PageFilterProvider } from '@/features/filter'
import { SubmitRegistryProvider } from '@/features/submit'
import { registerTaskMetadataIcons, TaskPreviewProvider } from '@/features/task'
import { DangerConfirmProvider } from '@/features/danger-confirm'

// 装配根注册：metadata 图标由 task 注入，断开 meta→task 组件硬依赖
registerTaskMetadataIcons()

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
