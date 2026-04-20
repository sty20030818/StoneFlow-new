import type { PropsWithChildren } from 'react'

import { selectIsDrawerOpen, useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { ShellDrawer } from '@/app/layouts/shell/ShellDrawer'
import type { ShellDrawerKind } from '@/app/layouts/shell/types'
import { cn } from '@/shared/lib/utils'

type ShellMainProps = PropsWithChildren<{
	currentSpaceId: string
	activeDrawerKind: ShellDrawerKind | null
	activeDrawerId: string | null
	onCloseDrawer: () => void
}>

export function ShellMain({
	children,
	currentSpaceId,
	activeDrawerKind,
	activeDrawerId,
	onCloseDrawer,
}: ShellMainProps) {
	const isDrawerOpen = useShellLayoutStore(selectIsDrawerOpen)

	return (
		<main className='relative flex min-w-0 flex-1 overflow-hidden bg-transparent'>
			<div className='flex min-w-0 flex-1 pr-2'>
				<div className='relative flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-[0.625rem] bg-card shadow-[6px_0_18px_rgb(15_23_42/0.04)]'>
					<div
						className={cn(
							'no-scrollbar min-w-0 flex-1 overflow-y-auto',
							isDrawerOpen && 'overflow-hidden',
						)}
					>
						<div className='flex min-h-full min-w-0 flex-col'>{children}</div>
					</div>

					<ShellDrawer
						activeDrawerId={activeDrawerId}
						activeDrawerKind={activeDrawerKind}
						currentSpaceId={currentSpaceId}
						onClose={onCloseDrawer}
						open={isDrawerOpen}
					/>
				</div>
			</div>
		</main>
	)
}
