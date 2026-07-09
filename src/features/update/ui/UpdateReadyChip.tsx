/**
 * 更新就绪非模态 Chip：自动下载完成后提示重启。
 * 点「稍后」仅隐藏 Chip，footer 仍保留就绪态。
 */

import { RefreshCwIcon } from 'lucide-react'

import { useUpdateActions } from '@/features/update/model/useUpdateEvents'
import {
	selectReadyChipVisible,
	useUpdateStore,
} from '@/features/update/model/useUpdateStore'
import { Button } from '@/shared/ui/base/button'
import { cn } from '@/shared/lib/utils'

export function UpdateReadyChip() {
	const visible = useUpdateStore(selectReadyChipVisible)
	const status = useUpdateStore((s) => s.status)
	const updateInfo = useUpdateStore((s) => s.updateInfo)
	const dismissReadyChip = useUpdateStore((s) => s.dismissReadyChip)
	const { restart } = useUpdateActions()

	if (!visible) return null

	const version =
		status.status === 'downloaded' ? status.version : (updateInfo?.version ?? '')

	return (
		<div
			role='status'
			aria-live='polite'
			className={cn(
				'pointer-events-none fixed inset-x-0 bottom-10 z-40 flex justify-center px-3',
			)}
		>
			<div
				className={cn(
					'pointer-events-auto flex max-w-md items-center gap-3 rounded-full',
					'border border-border bg-background/95 px-3 py-1.5 shadow-(--sf-shadow-float)',
					'backdrop-blur-sm supports-backdrop-filter:bg-background/85',
					'animate-in fade-in-0 slide-in-from-bottom-1 duration-200',
				)}
			>
				<span
					className='size-2 shrink-0 rounded-full bg-emerald-500'
					aria-hidden
				/>
				<p className='min-w-0 truncate text-[13px] font-medium text-foreground'>
					{version ? `v${version} 已就绪` : '更新已就绪'}
				</p>
				<div className='flex shrink-0 items-center gap-1'>
					<Button
						type='button'
						size='sm'
						variant='ghost'
						className='h-7 rounded-full px-2.5 text-[12px]'
						onClick={dismissReadyChip}
					>
						稍后
					</Button>
					<Button
						type='button'
						size='sm'
						className='h-7 rounded-full px-2.5 text-[12px] active:scale-[0.96]'
						onClick={() => void restart()}
					>
						<RefreshCwIcon aria-hidden className='-ml-0.5 mr-1 size-3.5' />
						重启
					</Button>
				</div>
			</div>
		</div>
	)
}
