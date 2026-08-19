import { EmptyState } from '@heroui-pro/react'
import { SearchIcon, SearchXIcon } from 'lucide-react'

export function EmptyHint({ title }: { title: string }) {
	return (
		<EmptyState className='min-h-40 px-5 py-6' size='sm'>
			<EmptyState.Header>
				<SearchIcon aria-hidden className='mx-auto size-5 text-muted' />
				<EmptyState.Title>{title}</EmptyState.Title>
			</EmptyState.Header>
		</EmptyState>
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
		<EmptyState className='min-h-32 px-5 py-4' size='sm'>
			<EmptyState.Header>
				<SearchXIcon aria-hidden className='mx-auto size-5 text-muted' />
				<EmptyState.Title>{errorMessage ? '搜索失败' : '没有匹配结果'}</EmptyState.Title>
				<EmptyState.Description>
					{errorMessage ?? '没有找到现有任务或项目，可以直接创建为新任务。'}
				</EmptyState.Description>
			</EmptyState.Header>
			{errorMessage ? null : (
				<EmptyState.Content>
					<span className='text-[11px] text-muted'>
						<kbd className='font-medium text-foreground'>Enter</kbd>
						<span> 创建「{title}」</span>
					</span>
				</EmptyState.Content>
			)}
		</EmptyState>
	)
}
