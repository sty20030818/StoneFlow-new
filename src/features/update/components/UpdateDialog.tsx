/**
 * UpdateDialog 容器：store / 动作接线与相位编排。
 * 壳层复用 create-dialog compact；目标版本说明由 changelog 模块提供。
 */

import { useEffect, useState } from 'react'
import { DownloadIcon, RefreshCwIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/shared/components/base/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/shared/components/base/dialog'
import {
	createDialogCompactShellClass,
	createDialogFooterClass,
	createDialogHeaderClass,
} from '@/shared/components/patterns/create-dialog'
import {
	dialogShellDescriptionClass,
	dialogShellTitleClass,
} from '@/shared/components/patterns/dialog-shell'
import { StatusNotice } from '@/shared/components/StatusNotice'
import { ActionTooltip, DisabledActionTooltip } from '@/shared/components/tooltip'
import { normalizeTauriError } from '@/shared/lib/normalize-tauri-error'
import { cn } from '@/shared/lib/utils'
import { ChangelogRelease, useChangelog } from '@/features/changelog'
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
	| { key: string; status: 'loading' }
	| { key: string; status: 'loaded'; configuredChannel: UpdateChannel }
	| { key: string; status: 'error'; message: string }
	| null

export function UpdateDialog() {
	const dialogVisible = useUpdateStore((s) => s.dialogVisible)
	const snapshot = useUpdateStore(selectUpdateSnapshot)
	const isChecking = useUpdateStore((s) => s.manualCheckPending)
	const closeDialog = useUpdateStore((s) => s.closeDialog)
	const { startDownload, install, cancelDownload } = useUpdateInstallActions()
	const { checkNow } = useManualUpdateCheck()
	const { phase, progress, errorMessage } = snapshot
	const updateInfo = snapshot.update
	const [currentVersion, setCurrentVersion] = useState<string | null>(null)
	const [readySettings, setReadySettings] = useState<ReadySettingsState>(null)
	const [closeTooltipOpen, setCloseTooltipOpen] = useState(false)

	const isDownloading = phase === 'downloading'
	const isReady = phase === 'ready'
	const isInstalling = phase === 'installing'
	const changelogTargetKey =
		dialogVisible && updateInfo ? `${updateInfo.channel}:${updateInfo.version}` : null
	const readyKey =
		dialogVisible && isReady && updateInfo ? `${updateInfo.channel}:${updateInfo.version}` : null
	const { releases } = useChangelog(
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
		if (!readyKey) {
			setReadySettings(null)
			return
		}

		setReadySettings({ key: readyKey, status: 'loading' })
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

	useEffect(() => {
		if (!dialogVisible || isInstalling) {
			setCloseTooltipOpen(false)
		}
	}, [dialogVisible, isInstalling])

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
			setCloseTooltipOpen(false)
			closeDialog()
		}
	}

	function handleClose() {
		setCloseTooltipOpen(false)
		closeDialog()
	}

	async function handleSkip() {
		if (!updateInfo) return
		try {
			const result = await skipVersion(updateInfo.version, updateInfo.channel)
			useUpdateStore.getState().applySnapshot(result.snapshot)
			if (result.status !== 'ok') throw new Error(result.message)
			closeDialog()
		} catch (error) {
			toast.error(normalizeTauriError(error, '跳过版本失败'))
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
	const showNotes = phase === 'available' && releases.length > 0
	const showBody = showNotes || isDownloading || isReady || isInstalling || Boolean(errorMessage)

	const titleText = isInstalling
		? '正在安装更新'
		: isReady
			? errorMessage
				? `安装 v${displayVersion} 失败`
				: '更新已下载，等待安装'
			: isDownloading
				? '正在下载更新'
				: isChecking
					? '正在检查更新'
					: isCheckError
						? '检查更新失败'
						: errorMessage
							? '更新下载失败'
							: `发现新版本 ${displayVersion}`

	const descText = isInstalling
		? `正在安装版本 ${displayVersion}，请勿关闭应用或重复操作。`
		: isReady
			? errorMessage
				? `版本 ${displayVersion} 的安装包仍然完整保留，可以直接重试，无需重新检查或下载。`
				: `版本 ${displayVersion} 已下载完成。点击「立即重启」才会安装；关闭应用或稍后再说都不会自动安装。`
			: isDownloading
				? '正在下载更新文件。整段进度可点回此窗口；取消后可重新下载。'
				: isChecking
					? '正在检查更新...'
					: isCheckError
						? '未能完成更新检查，请稍后重试。'
						: errorMessage
							? `版本 ${displayVersion} 仍可用，可以直接重新下载。`
							: '建议及时更新以获得最新功能和问题修复。'

	return (
		<Dialog onOpenChange={handleOpenChange} open={dialogVisible}>
			{/*
			 * 对齐创建任务/项目弹窗（CreateDialogShell）：
			 * - 外壳 p-0，分区自管 padding
			 * - 关闭钮在 header 行内 size-7（不是 absolute top-2 贴边）
			 * - 底栏复用 createDialogFooterClass
			 */}
			<DialogContent
				className={createDialogCompactShellClass}
				showCloseButton={false}
				disableAnimation
				onEscapeKeyDown={(event) => {
					if (isInstalling) event.preventDefault()
				}}
				onInteractOutside={(event) => {
					if (isInstalling) event.preventDefault()
				}}
			>
				<DialogTitle className='sr-only'>{titleText}</DialogTitle>
				<DialogDescription className='sr-only'>{descText}</DialogDescription>

				<div className={cn(createDialogHeaderClass, 'items-start gap-2')}>
					<div className='min-w-0 flex-1 space-y-1'>
						<h2 className={dialogShellTitleClass}>{titleText}</h2>
						<p className={dialogShellDescriptionClass}>{descText}</p>
					</div>
					{isInstalling ? (
						<DisabledActionTooltip label='关闭' reason='安装完成前无法关闭更新窗口'>
							<Button
								aria-label='关闭'
								className='size-7 shrink-0 text-sf-icon-secondary'
								disabled
								size='icon-sm'
								type='button'
								variant='ghost'
							>
								<XIcon aria-hidden className='size-3.5' />
							</Button>
						</DisabledActionTooltip>
					) : (
						<ActionTooltip onOpenChange={setCloseTooltipOpen} open={closeTooltipOpen}>
							<ActionTooltip.Trigger asChild>
								<Button
									aria-label='关闭'
									className='size-7 shrink-0 text-sf-icon-secondary'
									onClick={handleClose}
									size='icon-sm'
									type='button'
									variant='ghost'
								>
									<XIcon aria-hidden className='size-3.5' />
								</Button>
							</ActionTooltip.Trigger>
							<ActionTooltip.Content>
								<ActionTooltip.Row label='关闭' />
							</ActionTooltip.Content>
						</ActionTooltip>
					)}
				</div>

				{showBody ? (
					<div className='min-h-0 space-y-3 px-3'>
						{showNotes ? (
							<div
								aria-label='本次累计更新说明'
								className='max-h-64 space-y-5 overflow-y-auto rounded-xl bg-legacy-muted p-3'
								role='region'
							>
								{releases.map((release) => (
									<ChangelogRelease key={release.version} release={release} />
								))}
							</div>
						) : null}

						{isDownloading ? (
							<div className='space-y-2'>
								<div className='h-1.5 w-full overflow-hidden rounded-full bg-legacy-muted'>
									<div
										className='h-full rounded-full bg-primary'
										style={{ width: `${progressPercent}%` }}
									/>
								</div>
								<p className='text-[12px] leading-none text-sf-shell-text-tertiary tabular-nums'>
									{formatDownloadBytesLine(downloaded, total)}
								</p>
							</div>
						) : null}

						{isInstalling ? (
							<StatusNotice
								size='sm'
								variant='neutral'
								description='系统安装器正在处理已验证的安装包。完成前所有更新操作均已锁定。'
							/>
						) : null}

						{isReady && !errorMessage ? (
							<StatusNotice
								size='sm'
								variant='success'
								description='安装包已就绪。只有点击「立即重启」才会开始安装并退出当前进程。'
							/>
						) : null}

						{errorMessage ? (
							<StatusNotice role='alert' size='sm' variant='danger' description={errorMessage} />
						) : null}

						{isReady && settingsLoading ? (
							<StatusNotice size='sm' variant='neutral' description='正在确认当前更新渠道…' />
						) : null}

						{isReady && settingsError ? (
							<StatusNotice role='alert' size='sm' variant='danger' description={settingsError} />
						) : null}

						{isReady && crossChannel ? (
							<StatusNotice
								size='sm'
								variant='warning'
								description={`当前配置为 ${configuredChannelLabel} 渠道，仍将安装 ${sourceChannelLabel} v${displayVersion}。`}
							/>
						) : null}
					</div>
				) : null}

				<div className={cn(createDialogFooterClass, 'justify-end')}>
					{isInstalling ? (
						<Button disabled size='sm' type='button'>
							<span aria-hidden className='-ml-0.5 mr-2 size-3 rounded-full border-2 border-current' />
							正在安装...
						</Button>
					) : isReady ? (
						<>
							<Button onClick={closeDialog} size='sm' type='button' variant='ghost'>
								稍后重启
							</Button>
							<Button
								disabled={!canInstall}
								onClick={() => void install(crossChannel ? (updateInfo?.channel ?? null) : null)}
								size='sm'
								type='button'
							>
								<RefreshCwIcon aria-hidden className='-ml-0.5 mr-1 size-3.5' />
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
							{/* 取消下载单独靠左，远离右侧主操作，降低误触 */}
							<Button
								onClick={() => void cancelDownload()}
								size='sm'
								type='button'
								variant='ghost'
								className='mr-auto text-muted-foreground'
							>
								取消下载
							</Button>
							<Button onClick={closeDialog} size='sm' type='button' variant='ghost'>
								后台继续
							</Button>
							<Button disabled size='sm' type='button'>
								<span aria-hidden className='-ml-0.5 mr-2 size-3 rounded-full border-2 border-current' />
								下载中
							</Button>
						</>
					) : isChecking ? (
						<Button disabled size='sm' type='button'>
							<span aria-hidden className='-ml-0.5 mr-2 size-3 rounded-full border-2 border-current' />
							正在检查...
						</Button>
					) : isCheckError ? (
						<>
							<Button onClick={handleRetryCheck} size='sm' type='button'>
								<RefreshCwIcon aria-hidden className='-ml-0.5 mr-1 size-3.5' />
								重新检查
							</Button>
						</>
					) : phase === 'available' ? (
						<>
							<Button onClick={handleSkip} size='sm' type='button' variant='ghost'>
								跳过此版本
							</Button>
							<Button
								disabled={!canDownload}
								onClick={() => void startDownload()}
								size='sm'
								type='button'
							>
								<DownloadIcon aria-hidden className='-ml-0.5 mr-1 size-3.5' />
								{errorMessage ? '重新下载' : '立即更新'}
							</Button>
						</>
					) : (
						<Button onClick={closeDialog} size='sm' type='button' variant='ghost'>
							关闭
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
