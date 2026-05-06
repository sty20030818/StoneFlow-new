import { useState } from 'react'

import { getDrawerDetail } from '@/app/layouts/shell/config'
import { TaskDrawerContent } from '@/features/task-drawer/ui/TaskDrawerContent'
import type { ShellDrawerKind } from '@/app/layouts/shell/types'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/base/sheet'
import {
	shellDrawerCaptionClass,
	shellDrawerEmptyStateClass,
	shellDrawerItemLabelClass,
} from '@/shared/ui/patterns/shell-drawer'

type ShellDrawerProps = {
	open: boolean
	activeDrawerKind: ShellDrawerKind | null
	activeDrawerId: string | null
	currentSpaceLabel: string
	onClose: () => void
}

export function ShellDrawer({
	open,
	activeDrawerKind,
	activeDrawerId,
	currentSpaceLabel,
	onClose,
}: ShellDrawerProps) {
	const detail = getDrawerDetail(activeDrawerKind, activeDrawerId)
	const isRealTaskDrawer = activeDrawerKind === 'task' && !!activeDrawerId && !detail
	const drawerTitle = activeDrawerKind === 'project' ? '项目详情' : '任务详情'
	const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details')

	return (
		<Sheet modal={false} onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
			<SheetContent
				aria-describedby={undefined}
				className='absolute inset-y-2 right-2 z-50 w-[min(var(--sf-shell-drawer-width),calc(100%-0.5rem))] max-w-[calc(100%-0.5rem)] rounded-xl border border-sf-border-secondary bg-sf-shell-drawer/98 p-0 shadow-(--sf-shadow-float) backdrop-blur data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:left-auto data-[side=right]:h-auto data-[side=right]:w-[min(var(--sf-shell-drawer-width),calc(100%-0.5rem))] data-[side=right]:max-w-[calc(100%-0.5rem)]'
				data-shell-drawer-root='true'
				inline
				onInteractOutside={(event) => event.preventDefault()}
				onPointerDownOutside={(event) => event.preventDefault()}
				overlayClassName='pointer-events-none absolute inset-0 z-40 bg-[linear-gradient(90deg,rgb(17_19_24/0.02)_0%,rgb(17_19_24/0.05)_52%,rgb(17_19_24/0.08)_100%)]'
				showCloseButton={false}
				side='right'
			>
				<SheetHeader className='flex h-12 shrink-0 flex-row items-center justify-between gap-2 border-b border-sf-divider bg-muted/35 px-4 py-0'>
					<SheetTitle className='text-[13px] font-medium text-foreground'>{drawerTitle}</SheetTitle>
					<div className='flex gap-1'>
						<button
							className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
								activeTab === 'details'
									? 'bg-sf-surface-hover text-foreground'
									: 'text-sf-text-tertiary hover:text-foreground'
							}`}
							onClick={() => setActiveTab('details')}
							type='button'
						>
							详情
						</button>
						<button
							className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
								activeTab === 'activity'
									? 'bg-sf-surface-hover text-foreground'
									: 'text-sf-text-tertiary hover:text-foreground'
							}`}
							onClick={() => setActiveTab('activity')}
							type='button'
						>
							动态
						</button>
					</div>
				</SheetHeader>

				<div className='no-scrollbar flex flex-1 flex-col overflow-hidden'>
					{isRealTaskDrawer && activeDrawerId ? (
						<TaskDrawerContent
							activeTab={activeTab}
							currentSpaceLabel={currentSpaceLabel}
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
									<p className={shellDrawerCaptionClass}>{section.title}</p>
									<div className='space-y-1.5'>
										{section.items.map((item) => (
											<div
												className='rounded-lg border border-sf-border-subtle bg-muted/45 px-3 py-2.5'
												key={`${section.title}-${item.label}`}
											>
												<p className={shellDrawerItemLabelClass}>{item.label}</p>
												<p className='mt-1 text-[12px] leading-5 text-foreground'>{item.value}</p>
											</div>
										))}
									</div>
								</section>
							))}
						</div>
					) : (
						<div className={shellDrawerEmptyStateClass}>当前没有可展示的详情数据。</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	)
}
