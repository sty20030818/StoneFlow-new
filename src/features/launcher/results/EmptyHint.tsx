import { SearchIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

export function EmptyHint({ title }: { title: string }) {
	return (
		<div className={cn('flex min-h-40 items-center justify-center px-5 py-6')}>
			<div className='flex items-center gap-2 rounded-full border border-black/[0.06] bg-legacy-background/90 px-3 py-2 text-[12px] text-sf-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]'>
				<SearchIcon className='size-4' />
				<span>{title}</span>
			</div>
		</div>
	)
}

export function SearchEmptyHint({
	title,
	errorMessage,
}: {
	title: string
	errorMessage?: string | null
}) {
	return (
		<div className='px-3 pb-3 pt-2'>
			<div className='flex min-h-24 flex-col items-center justify-center px-5 py-4 text-center'>
				<div className='text-[13px] font-medium text-legacy-foreground'>
					{errorMessage ? '搜索失败' : '没有匹配结果'}
				</div>
				<div className='mt-1 max-w-70 text-balance text-[12px] leading-5 text-sf-text-tertiary'>
					{errorMessage ?? '没有找到现有任务或项目，可以直接创建为新任务。'}
				</div>
				{errorMessage ? null : (
					<div className='mt-3 text-[11px] text-sf-text-quaternary'>
						<span className='font-medium text-sf-text-secondary'>Enter</span>
						<span> 创建「{title}」</span>
					</div>
				)}
			</div>
		</div>
	)
}
