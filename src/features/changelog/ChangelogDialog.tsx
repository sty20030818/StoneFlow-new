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
import { ActionTooltip } from '@/shared/components/tooltip'

import { ChangelogRelease } from './ChangelogRelease'
import type { ChangelogChannel } from './contract'
import { useChangelog } from './useChangelog'

export function ChangelogDialog({
	open,
	channel,
	focusVersion,
	onOpenChange,
}: {
	open: boolean
	channel: ChangelogChannel
	focusVersion?: string | null
	onOpenChange: (open: boolean) => void
}) {
	const { releases, isLoading } = useChangelog(open ? { kind: 'history', channel } : null)
	const targetRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (open && focusVersion) targetRef.current?.scrollIntoView({ block: 'start' })
	}, [focusVersion, open, releases])

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className='top-[18%] max-sm:max-w-[calc(100%-1.5rem)] max-lg:max-w-[calc(100%-1.5rem)] sm:max-w-190 translate-y-0 overflow-hidden rounded-lg border border-sf-border-subtle bg-legacy-background/98 p-0 shadow-(--sf-shadow-popover)'
				showCloseButton={false}
			>
				<DialogTitle className='sr-only'>更新日志</DialogTitle>
				<DialogDescription className='sr-only'>
					查看 StoneFlow 已发布版本的更新内容
				</DialogDescription>
				<ActionTooltip label='关闭'>
					<Button
						aria-label='关闭更新日志'
						className='absolute top-3 right-3 size-8'
						onClick={() => onOpenChange(false)}
						variant='ghost'
					>
						<XIcon aria-hidden className='size-4' />
					</Button>
				</ActionTooltip>
				<div className='flex items-center gap-2 px-5 pt-4 pb-2 pr-12'>
					<h2 className='min-w-0 text-[18px] leading-6 font-bold text-legacy-foreground'>
						更新日志
					</h2>
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
					) : releases.length ? (
						<div>
							{releases.map((release, index) => (
								<div
									className={index === 0 ? undefined : 'mt-7 border-t border-sf-divider pt-7'}
									key={release.version}
									ref={release.version === focusVersion ? targetRef : undefined}
								>
									<ChangelogRelease release={release} />
								</div>
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
