import { useEffect, useRef } from 'react'
import { XIcon } from 'lucide-react'

import { AppScrollArea } from '@/shared/components/AppScrollArea'
import { Badge } from '@/shared/components/base/badge'
import { Button } from '@/shared/components/base/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/shared/components/base/dialog'

import { ChangelogMarkdown } from './ChangelogMarkdown'
import { useChangelog } from './useChangelog'

export function ChangelogDialog({
	open,
	onOpenChange,
	version,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	version?: string | null
}) {
	const { channel, entries, isLoading } = useChangelog(version, open)
	const targetRef = useRef<HTMLElement>(null)
	useEffect(() => {
		if (open && version) targetRef.current?.scrollIntoView({ block: 'start' })
	}, [entries, open, version])
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className='top-[18%] max-sm:max-w-[calc(100%-1.5rem)] max-lg:max-w-[calc(100%-1.5rem)] sm:max-w-190 translate-y-0 overflow-hidden rounded-lg border border-sf-border-subtle bg-background/98 p-0 shadow-(--sf-shadow-popover)'
				disableAnimation
				showCloseButton={false}
			>
				<DialogTitle className='sr-only'>更新日志</DialogTitle>
				<DialogDescription className='sr-only'>
					查看 StoneFlow 已发布版本的更新内容
				</DialogDescription>
				<Button
					aria-label='关闭更新日志'
					className='absolute top-3 right-3 size-8'
					onClick={() => onOpenChange(false)}
					variant='ghost'
				>
					<XIcon className='size-4' />
				</Button>
				<div className='flex items-center gap-2 px-5 pt-4 pb-2 pr-12'>
					<h2 className='min-w-0 text-[18px] leading-6 font-bold text-foreground'>更新日志</h2>
					<Badge
						className='h-5 shrink-0 rounded-md border-sf-border-subtle bg-sf-surface-panel-muted px-1.5 text-[11px] font-medium text-sf-text-secondary'
						variant='outline'
					>
						{channel === 'beta' ? '测试版' : '正式版'}
					</Badge>
				</div>
				<AppScrollArea
					className='max-h-120'
					minThumbHeight={28}
					thumbLengthRatio={0.58}
					trackInsetBottom={8}
					trackInsetTop={4}
					viewportClassName='px-5 pt-1 pb-5'
				>
					{isLoading ? (
						<p className='text-[13px] text-sf-text-tertiary'>正在读取更新日志...</p>
					) : entries.length ? (
						<div>
							{entries.map((entry, index) => (
								<section
									className={index === 0 ? undefined : 'mt-7 border-t border-sf-divider pt-7'}
									key={entry.version}
									ref={entry.version === version ? targetRef : undefined}
								>
									<div className='mb-4 flex items-baseline gap-2'>
										<h3 className='text-[16px] font-semibold text-foreground'>v{entry.version}</h3>
										<span className='text-[12px] text-sf-text-tertiary'>{entry.date}</span>
									</div>
									<ChangelogMarkdown content={entry.content} />
								</section>
							))}
						</div>
					) : (
						<p className='text-[13px] text-sf-text-tertiary'>暂时没有可展示的更新日志。</p>
					)}
				</AppScrollArea>
			</DialogContent>
		</Dialog>
	)
}
