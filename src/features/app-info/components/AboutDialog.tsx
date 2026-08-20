import { Alert, Button, Modal, Spinner } from '@heroui/react'
import { ExternalLinkIcon, HistoryIcon, InfoIcon, RefreshCwIcon } from 'lucide-react'
import { useId } from 'react'

import { useManualUpdateCheck } from '@/features/update'
import { ActionTooltip, DisabledActionTooltip } from '@/shared/components/tooltip'

import { openAppInfoUrl } from '../api/appInfo'
import { useAppVersion } from '../hooks/useAppVersion'
import { appInfoLinks, isConfiguredAppInfoUrl } from '../model/appInfoLinks'

type AboutDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	onOpenChangelog: () => void
}

export function AboutDialog({ open, onOpenChange, onOpenChangelog }: AboutDialogProps) {
	const { checkNow, disabled, isChecking } = useManualUpdateCheck()
	const { version, isLoading, hasError } = useAppVersion()
	const descriptionId = useId()

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

	return (
		<Modal.Backdrop isOpen={open} onOpenChange={onOpenChange}>
			<Modal.Container placement='center' size='lg'>
				<Modal.Dialog
					aria-describedby={descriptionId}
					className='overflow-hidden'
					render={(dialogProps) => (
						<section
							{...dialogProps}
							onKeyDown={(event) => {
								if (event.key !== 'Escape' || event.defaultPrevented) event.stopPropagation()
							}}
						/>
					)}
				>
					<ActionTooltip label='关闭'>
						<Modal.CloseTrigger aria-label='关闭关于 StoneFlow' className='end-3 top-3' />
					</ActionTooltip>

					<Modal.Header>
						<div className='flex items-center gap-3'>
							<img alt='StoneFlow' className='size-12 shrink-0 rounded-xl' src='/StoneFlow.png' />
							<div className='min-w-0'>
								<Modal.Heading>StoneFlow</Modal.Heading>
								<p className='mt-1 truncate text-xs text-muted' id={descriptionId}>
									专注于日常工作的本地优先工作流。
								</p>
							</div>
						</div>
					</Modal.Header>

					<Modal.Body>
						<div className='flex items-center justify-between gap-3'>
							<span className='text-sm text-muted'>当前版本</span>
							{version ? (
								<span className='text-sm font-medium text-foreground tabular-nums'>v{version}</span>
							) : isLoading ? (
								<span className='inline-flex items-center gap-2 text-sm text-muted'>
									<Spinner aria-hidden size='sm' />
									正在读取版本信息...
								</span>
							) : (
								<span className='text-sm text-muted'>版本信息暂不可用</span>
							)}
						</div>

						{hasError ? (
							<Alert role='alert' status='danger'>
								<Alert.Indicator />
								<Alert.Content>
									<Alert.Title>版本信息读取失败</Alert.Title>
									<Alert.Description>仍可查看更新日志或稍后重新打开。</Alert.Description>
								</Alert.Content>
							</Alert>
						) : null}

						<div className='grid grid-cols-2 gap-2'>
							<Button onPress={handleOpenChangelog} size='sm' type='button' variant='outline'>
								<HistoryIcon aria-hidden className='size-3.5' />
								更新日志
							</Button>
							<Button
								isDisabled={disabled}
								isPending={isChecking}
								onPress={() => void checkNow()}
								size='sm'
								type='button'
							>
								{({ isPending }) => (
									<>
										{isPending ? (
											<Spinner aria-hidden color='current' size='sm' />
										) : (
											<RefreshCwIcon aria-hidden className='size-3.5' />
										)}
										{isPending ? '检查中...' : '检查更新'}
									</>
								)}
							</Button>
						</div>

						<div className='space-y-2'>
							<p className='text-xs font-medium text-muted'>资料与支持</p>
							<div className='grid grid-cols-2 gap-2'>
								{appInfoLinks.map((link) => {
									const canOpen = isConfiguredAppInfoUrl(link.url)
									const linkButton = (
										<Button
											aria-label={canOpen ? link.label : `${link.label}，待配置`}
											className='w-full'
											isDisabled={!canOpen}
											key={link.key}
											onPress={() => handleOpenLink(link.url)}
											size='sm'
											type='button'
											variant='ghost'
										>
											<span className='flex min-w-0 w-full items-center gap-2 text-left'>
												{link.key === 'license' ? (
													<InfoIcon aria-hidden className='size-3.5' />
												) : (
													<ExternalLinkIcon aria-hidden className='size-3.5' />
												)}
												<span className='truncate'>{link.label}</span>
												{canOpen ? null : <span className='ml-auto text-xs'>待配置</span>}
											</span>
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
					</Modal.Body>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}
