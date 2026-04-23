import { getDrawerDetail } from '@/app/layouts/shell/config'
import { TaskDrawerContent } from '@/features/task-drawer/ui/TaskDrawerContent'
import type { ShellDrawerKind } from '@/app/layouts/shell/types'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/base/sheet'
import { XIcon } from 'lucide-react'

type ShellDrawerProps = {
	open: boolean
	activeDrawerKind: ShellDrawerKind | null
	activeDrawerId: string | null
	currentSpaceId: string
	onClose: () => void
}

export function ShellDrawer({
	open,
	activeDrawerKind,
	activeDrawerId,
	currentSpaceId,
	onClose,
}: ShellDrawerProps) {
	const detail = getDrawerDetail(activeDrawerKind, activeDrawerId)
	const isRealTaskDrawer = activeDrawerKind === 'task' && !!activeDrawerId && !detail
	const drawerTitle = activeDrawerKind === 'project' ? 'Project detail' : 'Task detail'

	return (
		<Sheet modal={false} onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<SheetContent
				aria-describedby={undefined}
				className='absolute inset-y-3 right-3 z-50 w-[min(var(--sf-shell-drawer-width),calc(100%-1.5rem))] max-w-[calc(100%-1.5rem)] rounded-xl border border-(--sf-color-border-secondary) bg-(--sf-color-shell-drawer)/98 p-0 shadow-(--sf-shadow-float) backdrop-blur data-[side=right]:inset-y-3 data-[side=right]:right-3 data-[side=right]:left-auto data-[side=right]:h-auto data-[side=right]:w-[min(var(--sf-shell-drawer-width),calc(100%-1.5rem))] data-[side=right]:max-w-[calc(100%-1.5rem)]'
				data-shell-drawer-root='true'
				inline
				onInteractOutside={(event) => event.preventDefault()}
				onPointerDownOutside={(event) => event.preventDefault()}
				overlayClassName='pointer-events-none absolute inset-0 z-40 bg-[linear-gradient(90deg,rgb(17_19_24/0.02)_0%,rgb(17_19_24/0.05)_52%,rgb(17_19_24/0.08)_100%)]'
				showCloseButton={false}
				side='right'
			>
				<SheetHeader className='flex h-12 shrink-0 flex-row items-center justify-between gap-2 border-b border-(--sf-color-divider) bg-muted/35 px-4 py-0'>
					<SheetTitle className='text-[13px] font-medium text-foreground'>{drawerTitle}</SheetTitle>
					<SheetClose asChild>
						<Button aria-label='关闭详情面板' size='icon-sm' variant='ghost'>
							<XIcon className='size-3.5' />
						</Button>
					</SheetClose>
				</SheetHeader>

				<div className='no-scrollbar flex-1 overflow-y-auto px-4 py-4'>
					{isRealTaskDrawer && activeDrawerId ? (
						<TaskDrawerContent
							currentSpaceId={currentSpaceId}
							onClose={onClose}
							taskId={activeDrawerId}
						/>
					) : detail ? (
						<div className='space-y-4'>
							<div className='space-y-2'>
								<div className='flex flex-wrap items-center gap-2'>
									{detail.badges.map((badge) => (
										<Badge key={badge.label} variant={badge.variant ?? 'secondary'}>
											{badge.label}
										</Badge>
									))}
								</div>
								<h2 className='text-[13px] font-medium leading-6 text-foreground'>
									{detail.title}
								</h2>
								<Button className='h-8 w-full justify-center' variant='outline'>
									标记完成
								</Button>
							</div>

							{detail.sections.map((section) => (
								<section className='space-y-2' key={section.title}>
									<p className='text-[11px] font-medium tracking-[0.06em] text-(--sf-color-shell-tertiary) uppercase'>
										{section.title}
									</p>
									<div className='space-y-1.5'>
										{section.items.map((item) => (
											<div
												className='rounded-lg border border-(--sf-color-border-subtle) bg-muted/45 px-3 py-2.5'
												key={`${section.title}-${item.label}`}
											>
												<p className='text-[11px] text-(--sf-color-shell-tertiary)'>{item.label}</p>
												<p className='mt-1 text-[12px] leading-5 text-foreground'>{item.value}</p>
											</div>
										))}
									</div>
								</section>
							))}
						</div>
					) : (
						<div className='rounded-lg border border-(--sf-color-border-subtle) bg-muted/60 px-3.5 py-3 text-[12px] text-(--sf-color-shell-tertiary)'>
							当前没有可展示的详情。
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}
