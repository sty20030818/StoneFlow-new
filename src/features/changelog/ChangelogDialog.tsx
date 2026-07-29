import { useEffect, useRef } from 'react'
import { XIcon } from 'lucide-react'

import { AppScrollArea } from '@/shared/components/AppScrollArea'
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
				<DialogTitle className='sr-only'>更新记录</DialogTitle>
				<DialogDescription className='sr-only'>
					查看 StoneFlow 已发布版本的更新内容
				</DialogDescription>
				<Button
					aria-label='关闭更新记录'
					className='absolute top-3 right-3 size-8'
					onClick={() => onOpenChange(false)}
					variant='ghost'
				>
					<XIcon className='size-4' />
				</Button>
				<div className='px-5 pt-4 pb-3'>
					<h2 className='pr-9 text-[16px] font-medium text-foreground'>更新记录</h2>
					<p className='mt-1 text-[12px] text-sf-text-tertiary'>
						{channel === 'beta' ? '正式版与测试版更新' : '正式版更新'}
					</p>
				</div>
				<AppScrollArea
					className='max-h-120'
					minThumbHeight={28}
					thumbLengthRatio={0.58}
					trackInsetBottom={8}
					trackInsetTop={4}
					viewportClassName='px-5 pb-5'
				>
					{isLoading ? (
						<p className='text-[13px] text-sf-text-tertiary'>正在读取更新记录...</p>
					) : entries.length ? (
						<div className='space-y-8'>
							{entries.map((entry) => (
								<section
									key={entry.version}
									ref={entry.version === version ? targetRef : undefined}
								>
									<div className='mb-3 flex items-baseline gap-2'>
										<h3 className='text-[14px] font-semibold text-foreground'>v{entry.version}</h3>
										<span className='text-[12px] text-sf-text-quaternary'>{entry.date}</span>
									</div>
									<ChangelogMarkdown content={entry.content} />
								</section>
							))}
						</div>
					) : (
						<p className='text-[13px] text-sf-text-tertiary'>暂时没有可展示的更新记录。</p>
					)}
				</AppScrollArea>
			</DialogContent>
		</Dialog>
	)
}
