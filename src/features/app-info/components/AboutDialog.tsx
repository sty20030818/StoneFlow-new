import { Alert, Button, Modal, Separator, Spinner } from '@heroui/react'
import { ExternalLinkIcon, InfoIcon, XIcon } from 'lucide-react'
import { useId } from 'react'

import { useManualUpdateCheck } from '@/features/update'
import { ActionTooltip } from '@/shared/components/tooltip'

import { openAppInfoUrl } from '../api/appInfo'
import { useAppVersion } from '../hooks/useAppVersion'
import { appInfoLinks, isConfiguredAppInfoUrl } from '../model/appInfoLinks'

export type AboutDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	onOpenChangelog: () => void
}

export function AboutDialog({ open, onOpenChange, onOpenChangelog }: AboutDialogProps) {
	const { checkNow, disabled, isChecking } = useManualUpdateCheck()
	const { version, isLoading, hasError } = useAppVersion()
	const descriptionId = useId()
	const configuredLinks = appInfoLinks.filter((link) => isConfiguredAppInfoUrl(link.url))

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
			<Modal.Container placement='center' size='sm'>
				<Modal.Dialog
					aria-describedby={descriptionId}
					className='overflow-hidden sm:max-w-105'
					render={(dialogProps) => (
						<section
							{...dialogProps}
							onKeyDown={(event) => {
								if (event.key === 'Tab') return
								if (event.key !== 'Escape' || event.defaultPrevented) event.stopPropagation()
							}}
						/>
					)}
				>
					<ActionTooltip label='关闭'>
						<Button
							aria-label='关闭关于 StoneFlow'
							className='absolute end-3 top-3'
							isIconOnly
							size='sm'
							slot='close'
							type='button'
							variant='ghost'
						>
							<XIcon aria-hidden className='size-3.5' />
						</Button>
					</ActionTooltip>

					<Modal.Header>
						<div className='flex flex-col items-center gap-3 text-center'>
							<img alt='' className='size-16 shrink-0 rounded-xl' src='/StoneFlow.png' />
							<div className='min-w-0 space-y-1'>
								<Modal.Heading className='text-xl font-semibold'>StoneFlow</Modal.Heading>
								<p className='text-sm text-muted' id={descriptionId}>
									本地优先的任务与项目管理。
								</p>
							</div>
							<div className='flex items-center justify-center gap-2 text-xs'>
								<span className='text-muted'>当前版本</span>
								{version ? (
									<span className='font-medium text-foreground tabular-nums'>v{version}</span>
								) : isLoading ? (
									<span className='inline-flex items-center gap-2 text-muted'>
										<Spinner aria-hidden size='sm' />
										正在读取版本信息...
									</span>
								) : (
									<span className='text-muted'>版本信息暂不可用</span>
								)}
							</div>
						</div>
					</Modal.Header>

					{hasError || configuredLinks.length > 0 ? (
						<Modal.Body>
							<div className='flex flex-col gap-4'>
								{hasError ? (
									<Alert role='alert' status='danger'>
										<Alert.Indicator />
										<Alert.Content>
											<Alert.Title>版本信息读取失败</Alert.Title>
											<Alert.Description>仍可查看更新日志或稍后重新打开。</Alert.Description>
										</Alert.Content>
									</Alert>
								) : null}

								{configuredLinks.length > 0 ? (
									<div className='space-y-3'>
										<Separator />
										<p className='text-center text-xs text-muted'>资料与支持</p>
										<div className='flex flex-wrap justify-center gap-1'>
											{configuredLinks.map((link) => (
												<Button
													key={link.key}
													onPress={() => handleOpenLink(link.url)}
													size='sm'
													type='button'
													variant='ghost'
												>
													{link.key === 'license' ? (
														<InfoIcon aria-hidden className='size-3.5' />
													) : (
														<ExternalLinkIcon aria-hidden className='size-3.5' />
													)}
													{link.label}
												</Button>
											))}
										</div>
									</div>
								) : null}
							</div>
						</Modal.Body>
					) : null}

					<Modal.Footer>
						<div className='flex w-full flex-wrap items-center justify-center gap-2'>
							<Button onPress={handleOpenChangelog} size='sm' type='button' variant='ghost'>
								更新日志
							</Button>
							<Button
								isDisabled={disabled}
								isPending={isChecking}
								onPress={() => void checkNow()}
								size='sm'
								type='button'
								variant='outline'
							>
								{({ isPending }) => (
									<>
										{isPending ? <Spinner aria-hidden color='current' size='sm' /> : null}
										{isPending ? '检查中...' : '检查更新'}
									</>
								)}
							</Button>
						</div>
					</Modal.Footer>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}
