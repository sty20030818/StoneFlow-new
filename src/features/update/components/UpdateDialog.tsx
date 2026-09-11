import { Alert, Button, Card, Chip, Modal, ProgressBar, Spinner, toast } from '@heroui/react'
import { useEffect, useId, useState } from 'react'
import { DownloadIcon, RefreshCwIcon, XIcon } from 'lucide-react'
import { ActionTooltip, DisabledActionTooltip } from '@/shared/components/tooltip'
import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'
import { useChangelog } from '@/features/changelog'
import { ChangelogRelease, ChangelogReleaseContent } from '@/features/changelog/presentation'
import {
	getCurrentVersion,
	getUpdateSettings,
	skipVersion,
	type UpdateChannel,
} from '../api/updates'
import { useUpdateInstallActions } from '../hooks/useUpdateInstallActions'
import { useManualUpdateCheck } from '../hooks/useManualUpdateCheck'
import { downloadProgressBarValue, formatDownloadBytesLine } from '../model/updatePresentation'
import { selectUpdateSnapshot, useUpdateStore } from '../model/useUpdateStore'

type ReadySettingsState =
	| { key: string | null; status: 'loading' }
	| { key: string; status: 'loaded'; configuredChannel: UpdateChannel }
	| { key: string; status: 'error'; message: string }

export function UpdateDialog() {
	const dialogVisible = useUpdateStore((s) => s.dialogVisible)
	const snapshot = useUpdateStore(selectUpdateSnapshot)
	const isChecking = useUpdateStore((s) => s.manualCheckPending)
	const closeDialog = useUpdateStore((s) => s.closeDialog)
	const { startDownload, install, cancelDownload } = useUpdateInstallActions()
	const { checkNow } = useManualUpdateCheck()
	const { phase, progress, errorMessage } = snapshot
	const updateInfo = snapshot.update
	const [currentVersion, setCurrentVersion] = useState<string | null>()
	const descriptionId = useId()

	const isDownloading = phase === 'downloading'
	const isReady = phase === 'ready'
	const isInstalling = phase === 'installing'
	const changelogTargetKey =
		dialogVisible && updateInfo ? `${updateInfo.channel}:${updateInfo.version}` : null
	const readyKey =
		dialogVisible && isReady && updateInfo ? `${updateInfo.channel}:${updateInfo.version}` : null
	const [readySettings, setReadySettings] = useState<ReadySettingsState>({
		key: readyKey,
		status: 'loading',
	})
	if (readySettings.key !== readyKey) setReadySettings({ key: readyKey, status: 'loading' })
	const { releases, isLoading: notesLoading } = useChangelog(
		dialogVisible && currentVersion && updateInfo
			? {
					kind: 'range',
					channel: updateInfo.channel,
					currentVersion,
					targetVersion: updateInfo.version,
				}
			: null,
	)

	useEffect(() => {
		let active = true
		if (!changelogTargetKey) return

		void getCurrentVersion()
			.then((version) => {
				if (active) setCurrentVersion(version)
			})
			.catch(() => {
				if (active) setCurrentVersion(null)
			})

		return () => {
			active = false
		}
	}, [changelogTargetKey])

	useEffect(() => {
		let active = true
		if (!readyKey) return
		void getUpdateSettings()
			.then((settings) => {
				if (active) {
					setReadySettings({
						key: readyKey,
						status: 'loaded',
						configuredChannel: settings.channel,
					})
				}
			})
			.catch((error) => {
				if (active) {
					setReadySettings({
						key: readyKey,
						status: 'error',
						message: normalizeTauriError(error, '读取更新渠道失败'),
					})
				}
			})

		return () => {
			active = false
		}
	}, [readyKey])

	const currentReadySettings = readySettings?.key === readyKey ? readySettings : null
	const settingsLoading =
		isReady && currentReadySettings?.status !== 'loaded' && currentReadySettings?.status !== 'error'
	const settingsError =
		currentReadySettings?.status === 'error' ? currentReadySettings.message : null
	const configuredChannel =
		currentReadySettings?.status === 'loaded' ? currentReadySettings.configuredChannel : null
	const crossChannel = Boolean(
		updateInfo && configuredChannel && configuredChannel !== updateInfo.channel,
	)
	const canInstall = Boolean(updateInfo && configuredChannel && !settingsError && !settingsLoading)

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen && !isInstalling) {
			closeDialog()
		}
	}

	async function handleSkip() {
		if (!updateInfo) return
		try {
			const result = await skipVersion(updateInfo.version, updateInfo.channel)
			useUpdateStore.getState().applySnapshot(result.snapshot)
			if (result.status !== 'ok') throw new Error(result.message)
			closeDialog()
		} catch (error) {
			toast.danger(normalizeTauriError(error, '跳过版本失败'))
		}
	}

	function handleRetryCheck() {
		// 保留当前 Dialog，在统一 store 进入 checking 后直接呈现检查中状态。
		void checkNow()
	}

	const canDownload = phase === 'available' && Boolean(updateInfo)
	const isCheckError = phase === 'idle' && Boolean(errorMessage)

	const downloaded = progress?.downloaded ?? 0
	const total = progress?.total ?? null
	// 无 total 时必须给 0，禁止 width:undefined（块级条会撑满成「100%」）
	const progressPercent = isDownloading ? downloadProgressBarValue(downloaded, total) : 0

	const displayVersion = updateInfo?.version ?? ''
	const sourceChannelLabel = updateInfo?.channel === 'beta' ? 'Beta' : 'Stable'
	const configuredChannelLabel = configuredChannel === 'beta' ? 'Beta' : 'Stable'
	const targetRelease = releases.find((release) => release.version === updateInfo?.version)
	const showNotes = phase === 'available'
	const notesIncomplete = showNotes && !targetRelease
	const showBody =
		isDownloading ||
		(isReady && (settingsLoading || settingsError || crossChannel)) ||
		Boolean(errorMessage)

	const titleText = isInstalling
		? '正在安装更新'
		: isReady
			? errorMessage
				? '安装更新失败'
				: '更新已下载，等待安装'
			: isDownloading
				? '正在下载更新'
				: isChecking
					? '正在检查更新'
					: isCheckError
						? '检查更新失败'
						: errorMessage
							? '更新下载失败'
							: '发现新版本'

	const descText = isInstalling
		? `正在安装 v${displayVersion}，完成前无法关闭窗口，请勿退出应用。`
		: isReady
			? errorMessage
				? `v${displayVersion} 的安装包仍然完整保留，可直接重试，无需重新下载。`
				: `v${displayVersion} 已准备好，由你确认重启安装。关闭窗口不会自动安装。`
			: isDownloading
				? `正在下载 v${displayVersion}，可关闭窗口在后台继续。`
				: isChecking
					? '正在连接更新服务…'
					: isCheckError
						? '未能完成更新检查，请稍后重试。'
						: errorMessage
							? '此版本仍可用，可以重新下载。'
							: '下载完成后，由你决定何时重启安装。'

	return (
		<Modal.Backdrop
			isDismissable={!isInstalling}
			isKeyboardDismissDisabled={isInstalling}
			isOpen={dialogVisible}
			onOpenChange={handleOpenChange}
		>
			<Modal.Container placement='center' scroll='inside' size='lg'>
				<Modal.Dialog
					aria-describedby={descriptionId}
					className='max-h-[min(42rem,calc(100dvh-3rem))] overflow-hidden sm:max-w-2xl'
					data-release-dialog={showNotes || undefined}
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
					<Modal.Header>
						<div className='flex items-start gap-3'>
							<div className='min-w-0 flex-1 space-y-1 ps-2'>
								<div className='flex flex-wrap items-center gap-2'>
									<div className='flex items-center gap-2'>
										<RefreshCwIcon aria-hidden className='size-4 shrink-0 text-muted' />
										<Modal.Heading>{titleText}</Modal.Heading>
									</div>
									{phase === 'available' && updateInfo ? (
										<>
											<Chip size='sm' variant='soft'>
												v{displayVersion}
											</Chip>
											{targetRelease ? (
												<time className='text-xs text-muted' dateTime={targetRelease.date}>
													{targetRelease.date}
												</time>
											) : null}
										</>
									) : null}
								</div>
								<p className='text-sm leading-5 text-muted' id={descriptionId}>
									{descText}
								</p>
							</div>
							{isInstalling ? (
								<DisabledActionTooltip label='关闭' reason='安装完成前无法关闭更新窗口'>
									<Button
										aria-label='关闭'
										isDisabled
										isIconOnly
										size='sm'
										type='button'
										variant='ghost'
									>
										<XIcon aria-hidden className='size-3.5' />
									</Button>
								</DisabledActionTooltip>
							) : (
								<ActionTooltip label='关闭'>
									<Button
										aria-label='关闭'
										isIconOnly
										size='sm'
										slot='close'
										type='button'
										variant='ghost'
									>
										<XIcon aria-hidden className='size-3.5' />
									</Button>
								</ActionTooltip>
							)}
						</div>
					</Modal.Header>

					{showNotes ? (
						<Card className='mt-3 min-h-0 flex-1'>
							<Card.Content
								aria-label='本次累计更新说明'
								className='scrollbar min-h-0 overflow-y-auto overscroll-contain'
								role='region'
								tabIndex={0}
							>
								<div className='space-y-5'>
									{notesIncomplete ? (
										<p aria-live='polite' className='text-sm text-muted' role='status'>
											{currentVersion === undefined || notesLoading
												? '正在读取本次更新说明…'
												: '本次更新说明暂不可用，不影响更新。'}
										</p>
									) : null}
									{releases.map((release) =>
										release.version === displayVersion ? (
											<ChangelogReleaseContent
												headingLevel={3}
												key={release.version}
												release={release}
											/>
										) : (
											<ChangelogRelease key={release.version} release={release} />
										),
									)}
								</div>
							</Card.Content>
						</Card>
					) : null}

					{showBody ? (
						<Modal.Body className={showNotes ? 'mt-3 max-h-[25dvh] flex-initial' : undefined}>
							{isDownloading ? (
								<div className='space-y-2'>
									<ProgressBar aria-label='下载进度' size='sm' value={progressPercent}>
										<ProgressBar.Track>
											<ProgressBar.Fill />
										</ProgressBar.Track>
									</ProgressBar>
									<p className='text-xs leading-none text-muted tabular-nums'>
										{formatDownloadBytesLine(downloaded, total)}
									</p>
								</div>
							) : null}

							{errorMessage ? (
								<Alert role='alert' status='danger'>
									<Alert.Indicator />
									<Alert.Content>
										<Alert.Title>更新失败</Alert.Title>
										<Alert.Description>{errorMessage}</Alert.Description>
									</Alert.Content>
								</Alert>
							) : null}

							{isReady && settingsLoading ? (
								<Alert aria-busy='true' aria-live='polite' role='status' status='accent'>
									<Alert.Indicator>
										<Spinner aria-hidden color='current' size='sm' />
									</Alert.Indicator>
									<Alert.Content>
										<Alert.Title>正在确认当前更新渠道</Alert.Title>
									</Alert.Content>
								</Alert>
							) : null}

							{isReady && settingsError ? (
								<Alert role='alert' status='danger'>
									<Alert.Indicator />
									<Alert.Content>
										<Alert.Title>读取更新渠道失败</Alert.Title>
										<Alert.Description>{settingsError}</Alert.Description>
									</Alert.Content>
								</Alert>
							) : null}

							{isReady && crossChannel ? (
								<Alert status='warning'>
									<Alert.Indicator />
									<Alert.Content>
										<Alert.Title>更新渠道已切换</Alert.Title>
										<Alert.Description>{`当前配置为 ${configuredChannelLabel} 渠道，仍将安装 ${sourceChannelLabel} v${displayVersion}。`}</Alert.Description>
									</Alert.Content>
								</Alert>
							) : null}
						</Modal.Body>
					) : null}

					<Modal.Footer className={showNotes ? 'mt-3' : 'mt-5'}>
						{isInstalling ? (
							<Button isDisabled isPending size='sm' type='button'>
								<Spinner aria-hidden color='current' size='sm' />
								正在安装...
							</Button>
						) : isReady ? (
							<>
								<Button onPress={closeDialog} size='sm' type='button' variant='ghost'>
									稍后重启
								</Button>
								<Button
									isDisabled={!canInstall}
									onPress={() => void install(crossChannel ? (updateInfo?.channel ?? null) : null)}
									size='sm'
									type='button'
								>
									<RefreshCwIcon aria-hidden className='size-3.5' />
									{settingsLoading
										? '正在确认...'
										: errorMessage
											? '重试安装'
											: crossChannel
												? '确认安装并重启'
												: '立即重启'}
								</Button>
							</>
						) : isDownloading ? (
							<>
								<Button
									className='mr-auto'
									onPress={() => void cancelDownload()}
									size='sm'
									type='button'
									variant='ghost'
								>
									取消下载
								</Button>
								<Button onPress={closeDialog} size='sm' type='button' variant='secondary'>
									后台继续
								</Button>
							</>
						) : isChecking ? (
							<Button isDisabled isPending size='sm' type='button'>
								<Spinner aria-hidden color='current' size='sm' />
								正在检查...
							</Button>
						) : isCheckError ? (
							<Button onPress={handleRetryCheck} size='sm' type='button'>
								<RefreshCwIcon aria-hidden className='size-3.5' />
								重新检查
							</Button>
						) : phase === 'available' ? (
							<div className='flex w-full flex-wrap items-center justify-between gap-2'>
								<Button onPress={() => void handleSkip()} size='sm' type='button' variant='ghost'>
									跳过此版本
								</Button>
								<div className='ml-auto flex items-center gap-2'>
									<Button onPress={closeDialog} size='sm' type='button' variant='secondary'>
										稍后
									</Button>
									<Button
										isDisabled={!canDownload}
										onPress={() => void startDownload()}
										size='sm'
										type='button'
									>
										<DownloadIcon aria-hidden className='size-3.5' />
										{errorMessage ? '重新下载' : '立即更新'}
									</Button>
								</div>
							</div>
						) : (
							<Button onPress={closeDialog} size='sm' type='button' variant='ghost'>
								关闭
							</Button>
						)}
					</Modal.Footer>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}
