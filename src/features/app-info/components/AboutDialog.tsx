import { useEffect, useState } from 'react'
import { ExternalLinkIcon, HistoryIcon, InfoIcon, RefreshCwIcon, XIcon } from 'lucide-react'

import { Button } from '@/shared/components/base/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/shared/components/base/dialog'
import { dialogShellReadingClass } from '@/shared/components/patterns/dialog-shell'
import { ActionTooltip, DisabledActionTooltip } from '@/shared/components/tooltip'
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
	const { checkNow, disabled, isChecking } = useManualUpdateCheck()
	const { version, isLoading, hasError } = useAppVersion()
	const [closeTooltipOpen, setCloseTooltipOpen] = useState(false)

	useEffect(() => {
		if (!open) {
			setCloseTooltipOpen(false)
		}
	}, [open])

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			setCloseTooltipOpen(false)
		}
		onOpenChange(nextOpen)
	}

	function handleOpenChangelog() {
		handleOpenChange(false)
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
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent className={cn(dialogShellReadingClass, 'sm:max-w-lg')} showCloseButton={false}>
				<DialogTitle className='sr-only'>关于 StoneFlow</DialogTitle>
				<DialogDescription className='sr-only'>
					查看 StoneFlow 版本、更新和资料入口。
				</DialogDescription>

				<ActionTooltip onOpenChange={setCloseTooltipOpen} open={closeTooltipOpen}>
					<ActionTooltip.Trigger asChild>
						<Button
							aria-label='关闭关于 StoneFlow'
							className='absolute top-3 right-3 size-8'
							onClick={() => handleOpenChange(false)}
							type='button'
							variant='ghost'
						>
							<XIcon aria-hidden className='size-4' />
						</Button>
					</ActionTooltip.Trigger>
					<ActionTooltip.Content>
						<ActionTooltip.Row label='关闭' />
					</ActionTooltip.Content>
				</ActionTooltip>

				<div className='flex items-center gap-3 px-5 pt-4 pb-3 pr-14'>
					<div className='flex min-w-0 items-center gap-3'>
						<img
							alt='StoneFlow'
							className='size-12 shrink-0 rounded-xl outline outline-black/10 dark:outline-white/10'
							src='/StoneFlow.png'
						/>
						<div className='min-w-0'>
							<h2 className='truncate text-[16px] font-medium text-legacy-foreground'>StoneFlow</h2>
							<p className='mt-1 truncate text-[12px] text-sf-text-tertiary'>
								专注于日常工作的本地优先工作流。
							</p>
						</div>
					</div>
				</div>

				<div className='space-y-4 px-5 pb-5'>
					<div className='flex items-center justify-between rounded-xl border border-sf-border-subtle bg-legacy-muted/25 px-3 py-2.5'>
						<span className='text-[13px] text-sf-text-secondary'>当前版本</span>
						<span
							className='text-[13px] font-medium text-legacy-foreground tabular-nums'
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
						<Button disabled={disabled} onClick={() => void checkNow()} size='sm' type='button'>
							<RefreshCwIcon aria-hidden className='size-3.5' />
							{isChecking ? '检查中...' : '检查更新'}
						</Button>
					</div>

					<div className='space-y-1.5'>
						<p className='px-0.5 text-[12px] font-medium text-sf-text-secondary'>资料与支持</p>
						<div className='grid grid-cols-2 gap-2'>
							{appInfoLinks.map((link) => {
								const canOpen = isConfiguredAppInfoUrl(link.url)
								const linkButton = (
									<Button
										aria-label={canOpen ? link.label : `${link.label}，待配置`}
										className='w-full justify-start'
										disabled={!canOpen}
										key={link.key}
										onClick={() => handleOpenLink(link.url)}
										size='sm'
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

								return canOpen ? (
									linkButton
								) : (
									<DisabledActionTooltip
										key={link.key}
										label={link.label}
										reason='此资料入口尚未配置'
									>
										{linkButton}
									</DisabledActionTooltip>
								)
							})}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
