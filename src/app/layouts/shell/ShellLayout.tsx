import type { PropsWithChildren } from 'react'

import {
	selectActiveDrawerId,
	selectActiveDrawerKind,
	selectIsCommandOpen,
	selectIsDrawerOpen,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import { ShellDrawer } from '@/app/layouts/shell/ShellDrawer'
import { ShellFooter } from '@/app/layouts/shell/ShellFooter'
import { ShellHeader } from '@/app/layouts/shell/ShellHeader'
import { ShellMain } from '@/app/layouts/shell/ShellMain'
import { ShellSidebar } from '@/app/layouts/shell/ShellSidebar'
import type { ShellSectionKey } from '@/app/layouts/shell/types'

type ShellLayoutProps = PropsWithChildren<{
	currentSpaceId: string
	activeSection: ShellSectionKey
}>

export function ShellLayout({ children, currentSpaceId, activeSection }: ShellLayoutProps) {
	const isCommandOpen = useShellLayoutStore(selectIsCommandOpen)
	const isDrawerOpen = useShellLayoutStore(selectIsDrawerOpen)
	const activeDrawerKind = useShellLayoutStore(selectActiveDrawerKind)
	const activeDrawerId = useShellLayoutStore(selectActiveDrawerId)
	const setCommandOpen = useShellLayoutStore((state) => state.setCommandOpen)
	const openDrawer = useShellLayoutStore((state) => state.openDrawer)
	const closeDrawer = useShellLayoutStore((state) => state.closeDrawer)

	return (
		<div className='sf-shell-layout flex h-full min-h-0 flex-col overflow-hidden bg-background'>
			<ShellHeader
				activeSection={activeSection}
				currentSpaceId={currentSpaceId}
				isCommandOpen={isCommandOpen}
				onCommandOpenChange={setCommandOpen}
				onOpenDrawer={openDrawer}
			/>

			<div className='relative flex min-h-0 flex-1 overflow-hidden'>
				<ShellSidebar currentSpaceId={currentSpaceId} />

				<div className='relative flex min-w-0 flex-1 flex-col overflow-hidden bg-(--sf-color-shell-chrome)'>
					<ShellMain>{children}</ShellMain>
				</div>

				<button
					aria-hidden={!isDrawerOpen}
					aria-label='关闭抽屉'
					className={`absolute inset-y-0 left-(--sf-shell-sidebar-width) right-0 z-20 bg-black/8 transition-opacity ${
						isDrawerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
					}`}
					onClick={closeDrawer}
					tabIndex={-1}
					type='button'
				/>

				<ShellDrawer
					activeDrawerId={activeDrawerId}
					activeDrawerKind={activeDrawerKind}
					onClose={closeDrawer}
					open={isDrawerOpen}
				/>
			</div>

			<ShellFooter activeSection={activeSection} currentSpaceId={currentSpaceId} />
		</div>
	)
}
