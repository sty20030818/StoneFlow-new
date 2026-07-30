import { ExternalLinkIcon, HistoryIcon, InfoIcon, RefreshCwIcon, XIcon } from 'lucide-react'

import { Button } from '@/shared/components/base/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/shared/components/base/dialog'
import { dialogShellReadingClass } from '@/shared/components/patterns/dialog-shell'
import { cn } from '@/shared/lib/utils'
import { useManualUpdateCheck } from '@/features/update'

import { openAppInfoUrl } from '../api/appInfo'
import { useAppVersion } from '../hooks/useAppVersion'
import { appInfoLinks, isConfiguredAppInfoUrl } from '../model/appInfoLinks'

type AboutDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	onOpenChangelog: () => void
}

/** StoneFlow 的低频应用信息与资料入口。 */
export function AboutDialog({ open, onOpenChange, onOpenChangelog }: AboutDialogProps) {
	const { checkNow, isChecking } = useManualUpdateCheck()
	const { version, isLoading, hasError } = useAppVersion()

	function handleOpenChangelog() {
		onOpenChange(false)
		onOpenChangelog()
	}

	function handleOpenLink(url: string | null) {
		if (!isConfiguredAppInfoUrl(url)) return
		void openAppInfoUrl(url).catch((error) => {
			console.error('Failed to open app information URL:', error)
		})
	}

	const versionText = version
		? `v${version}`
		: isLoading
			? '正在读取版本信息...'
			: '版本信息暂不可用'

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className={cn(dialogShellReadingClass, 'sm:max-w-lg')}
				disableAnimation
				showCloseButton={false}
			>
				<DialogTitle className='sr-only'>关于 StoneFlow</DialogTitle>
				<DialogDescription className='sr-only'>
					查看 StoneFlow 版本、更新和资料入口。
				</DialogDescription>

				<Button
					aria-label='关闭关于 StoneFlow'
					className='absolute top-3 right-3 size-8'
					onClick={() => onOpenChange(false)}
					type='button'
					variant='ghost'
				>
					<XIcon aria-hidden className='size-4' />
				</Button>

				<div className='flex items-center gap-3 px-5 pt-4 pb-3 pr-14'>
					<div className='flex min-w-0 items-center gap-3'>
						<img
							alt='StoneFlow'
							className='size-12 shrink-0 rounded-xl outline outline-black/10 dark:outline-white/10'
							src='/StoneFlow.png'
						/>
						<div className='min-w-0'>
							<h2 className='truncate text-[16px] font-medium text-foreground'>StoneFlow</h2>
							<p className='mt-1 truncate text-[12px] text-sf-text-tertiary'>
								专注于日常工作的本地优先工作流。
							</p>
						</div>
					</div>
				</div>

				<div className='space-y-4 px-5 pb-5'>
					<div className='flex items-center justify-between rounded-xl border border-sf-border-subtle bg-muted/25 px-3 py-2.5'>
						<span className='text-[13px] text-sf-text-secondary'>当前版本</span>
						<span
							className='text-[13px] font-medium text-foreground tabular-nums'
							data-error={hasError || undefined}
						>
							{versionText}
						</span>
					</div>

					<div className='grid grid-cols-2 gap-2'>
						<Button onClick={handleOpenChangelog} size='sm' type='button' variant='outline'>
							<HistoryIcon aria-hidden className='size-3.5' />
							更新日志
						</Button>
						<Button disabled={isChecking} onClick={() => void checkNow()} size='sm' type='button'>
							<RefreshCwIcon aria-hidden className={cn('size-3.5', isChecking && 'animate-spin')} />
							{isChecking ? '检查中...' : '检查更新'}
						</Button>
					</div>

					<div className='space-y-1.5'>
						<p className='px-0.5 text-[12px] font-medium text-sf-text-secondary'>资料与支持</p>
						<div className='grid grid-cols-2 gap-2'>
							{appInfoLinks.map((link) => {
								const canOpen = isConfiguredAppInfoUrl(link.url)
								return (
									<Button
										aria-label={canOpen ? link.label : `${link.label}，待配置`}
										className='justify-start'
										disabled={!canOpen}
										key={link.key}
										onClick={() => handleOpenLink(link.url)}
										size='sm'
										title={canOpen ? link.label : '待配置'}
										type='button'
										variant='ghost'
									>
										{link.key === 'license' ? (
											<InfoIcon aria-hidden className='size-3.5' />
										) : (
											<ExternalLinkIcon aria-hidden className='size-3.5' />
										)}
										<span className='truncate'>{link.label}</span>
										{canOpen ? null : <span className='ml-auto text-[11px]'>待配置</span>}
									</Button>
								)
							})}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
