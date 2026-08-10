import { EntityDetailDrawerHost, type EntityDetailRouteState } from '@/features/entity-detail'
import { Sheet, SheetContent } from '@/shared/components/base/sheet'
import { SheetTitle } from '@/shared/components/base/sheet'

type ShellDrawerProps = {
	open: boolean
	activeDetail: EntityDetailRouteState
	onClose: () => void
}

export function ShellDrawer({ open, activeDetail, onClose }: ShellDrawerProps) {
	return (
		<Sheet modal={false} onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<SheetContent
				aria-describedby={undefined}
				className='absolute inset-y-2 right-2 z-50 w-[min(var(--sf-shell-drawer-width),calc(100%-0.5rem))] max-w-[calc(100%-0.5rem)] rounded-xl border border-sf-border-secondary bg-sf-shell-drawer-bg/98 p-0 shadow-(--sf-shadow-float) backdrop-blur data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:left-auto data-[side=right]:h-auto data-[side=right]:w-[min(var(--sf-shell-drawer-width),calc(100%-0.5rem))] data-[side=right]:max-w-[calc(100%-0.5rem)]'
				data-shell-drawer-root='true'
				inline
				onInteractOutside={(event) => event.preventDefault()}
				onPointerDownOutside={(event) => event.preventDefault()}
				overlayClassName='pointer-events-none absolute inset-0 z-40 bg-[linear-gradient(90deg,rgb(17_19_24/0.02)_0%,rgb(17_19_24/0.05)_52%,rgb(17_19_24/0.08)_100%)]'
				showCloseButton={false}
				side='right'
			>
				<SheetTitle className='sr-only'>详情抽屉</SheetTitle>
				<div className='no-scrollbar flex flex-1 flex-col overflow-hidden'>
					<EntityDetailDrawerHost activeDetail={activeDetail} onClose={onClose} open={open} />
				</div>
			</SheetContent>
		</Sheet>
	)
}
