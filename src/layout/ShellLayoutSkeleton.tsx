import {
	shellChromeSkeletonMainCardClass,
	shellChromeSkeletonStatusTextClass,
} from '@/shared/components/patterns/shell-chrome'

type ShellLayoutSkeletonStatus = 'idle' | 'loading' | 'ready' | 'error'

type ShellLayoutSkeletonProps = {
	status: ShellLayoutSkeletonStatus
	/** error 时为错误文案；loading 时可覆盖默认「正在加载工作区…」 */
	message?: string | null
}

/**
 * 壳层统一首屏骨架（开屏 W2）。
 * `/` pending 与 chrome 未就绪共用，避免「居中文案页 → 骨架」两跳。
 */
export function ShellLayoutSkeleton({ status, message = null }: ShellLayoutSkeletonProps) {
	const statusText = status === 'error' ? (message ?? '加载失败') : (message ?? '正在加载工作区…')

	return (
		<div className='relative flex h-full min-h-0 flex-col overflow-hidden bg-background'>
			<div className='flex h-12 shrink-0 items-center justify-between border-b border-sf-border-subtle bg-sf-shell px-4'>
				<div className='h-4 w-40 rounded-full bg-sf-surface-panel-muted' />
				<div className='h-8 w-28 rounded-full bg-sf-surface-panel-muted' />
			</div>

			<div className='flex min-h-0 flex-1 overflow-hidden bg-sf-shell'>
				<aside className='flex w-64 shrink-0 flex-col gap-4 border-r border-sf-border-subtle bg-sf-shell px-3 py-4'>
					<div className='flex items-center gap-3'>
						<div className='size-9 rounded-2xl bg-sf-surface-panel-muted' />
						<div className='h-4 w-28 rounded-full bg-sf-surface-panel-muted' />
					</div>
					<div className='flex flex-col gap-2'>
						{Array.from({ length: 4 }).map((_, index) => (
							<div
								className='h-9 rounded-xl bg-sf-surface-panel-muted'
								key={`sidebar-skeleton-nav-${index}`}
							/>
						))}
					</div>
					<div className='mt-2 h-px bg-sf-border-subtle' />
					<div className='flex flex-col gap-2'>
						<div className='h-4 w-20 rounded-full bg-sf-surface-panel-muted' />
						{Array.from({ length: 3 }).map((_, index) => (
							<div
								className='h-8 rounded-xl bg-sf-surface-panel-muted'
								key={`sidebar-skeleton-project-${index}`}
							/>
						))}
					</div>
				</aside>

				<div className='flex min-h-0 flex-1 flex-col bg-sf-shell p-4'>
					<div className={shellChromeSkeletonMainCardClass}>
						<div className='h-6 w-48 rounded-full bg-sf-surface-panel-muted' />
						<div className='mt-6 grid gap-3'>
							<div className='h-16 rounded-2xl bg-sf-surface-panel-muted' />
							<div className='h-16 rounded-2xl bg-sf-surface-panel-muted' />
							<div className='h-28 rounded-3xl bg-sf-surface-panel-muted' />
						</div>
						<div className={shellChromeSkeletonStatusTextClass}>{statusText}</div>
					</div>
				</div>
			</div>

			<div className='h-9.5 shrink-0 border-t border-sf-border-subtle bg-sf-shell' />
		</div>
	)
}
