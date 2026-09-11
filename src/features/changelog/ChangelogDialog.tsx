import { Button, Card, Chip, Modal, Spinner } from '@heroui/react'
import { EmptyState } from '@heroui-pro/react'
import { HistoryIcon, XIcon } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

import { ActionTooltip } from '@/shared/components/tooltip'

import { ChangelogRelease } from './ChangelogRelease'
import type { ChangelogChannel } from './contract'
import { useChangelog } from './useChangelog'

export type ChangelogDialogProps = {
	open: boolean
	channel: ChangelogChannel
	focusVersion?: string | null
	onOpenChange: (open: boolean) => void
}

export function ChangelogDialog({
	open,
	channel,
	focusVersion,
	onOpenChange,
}: ChangelogDialogProps) {
	const { releases, isLoading } = useChangelog(open ? { kind: 'history', channel } : null)
	const targetRef = useRef<HTMLDivElement>(null)
	const positionedTarget = useRef<string | null>(null)
	const descriptionId = useId()
	const focusKey = open && focusVersion ? `${channel}:${focusVersion}` : null

	useEffect(() => {
		if (!focusKey) {
			positionedTarget.current = null
			return
		}
		if (positionedTarget.current === focusKey || !targetRef.current) return
		targetRef.current.scrollIntoView({ block: 'start' })
		positionedTarget.current = focusKey
	}, [focusKey, releases])

	return (
		<Modal.Backdrop isOpen={open} onOpenChange={onOpenChange}>
			<Modal.Container placement='top' scroll='inside' size='lg'>
				<Modal.Dialog
					aria-describedby={descriptionId}
					className='max-h-[min(42rem,calc(100dvh-3rem))] overflow-hidden sm:max-w-3xl'
					data-release-dialog
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
							aria-label='关闭更新日志'
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
						<div className='flex flex-wrap items-center gap-2 ps-2 pe-10'>
							<div className='flex items-center gap-2'>
								<HistoryIcon aria-hidden className='size-4 shrink-0 text-muted' />
								<Modal.Heading>更新日志</Modal.Heading>
							</div>
							<Chip color={channel === 'beta' ? 'warning' : 'default'} size='sm' variant='soft'>
								{channel === 'beta' ? '测试版' : '正式版'}
							</Chip>
							<p className='sr-only' id={descriptionId}>
								查看 StoneFlow 已发布版本的更新内容
							</p>
						</div>
					</Modal.Header>

					<div
						aria-label='更新日志内容'
						className='scrollbar -mx-2 mt-3 flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain px-2 [scrollbar-gutter:stable_both-edges]'
						role='region'
						tabIndex={0}
					>
						{isLoading && releases.length === 0 ? (
							<div
								aria-busy='true'
								aria-live='polite'
								className='flex items-center gap-2 text-sm text-muted'
								role='status'
							>
								<Spinner aria-hidden size='sm' />
								正在读取更新日志...
							</div>
						) : releases.length ? (
							releases.map((release) => (
								<Card
									className='shrink-0'
									key={release.version}
									ref={release.version === focusVersion ? targetRef : undefined}
								>
									<Card.Content>
										<ChangelogRelease release={release} />
									</Card.Content>
								</Card>
							))
						) : (
							<EmptyState size='sm'>
								<EmptyState.Header>
									<EmptyState.Title>暂无更新日志</EmptyState.Title>
									<EmptyState.Description>
										当前渠道暂时没有可展示的发布记录。
									</EmptyState.Description>
								</EmptyState.Header>
							</EmptyState>
						)}
					</div>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}
