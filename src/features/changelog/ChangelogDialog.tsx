import { Chip, Modal, Spinner } from '@heroui/react'
import { EmptyState } from '@heroui-pro/react'
import { useEffect, useId, useRef } from 'react'

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
	const descriptionId = useId()

	useEffect(() => {
		if (open && focusVersion) targetRef.current?.scrollIntoView({ block: 'start' })
	}, [focusVersion, open, releases])

	return (
		<Modal.Backdrop isOpen={open} onOpenChange={onOpenChange}>
			<Modal.Container placement='top' scroll='inside' size='lg'>
				<Modal.Dialog
					aria-describedby={descriptionId}
					className='max-h-[min(42rem,calc(100dvh-3rem))] gap-0 overflow-hidden p-0'
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
						<Modal.CloseTrigger aria-label='关闭更新日志' className='end-3 top-3' />
					</ActionTooltip>

					<Modal.Header className='flex-row items-center gap-2 px-5 pt-5 pr-14 pb-3'>
						<Modal.Heading>更新日志</Modal.Heading>
						<Chip color={channel === 'beta' ? 'warning' : 'default'} size='sm' variant='soft'>
							{channel === 'beta' ? '测试版' : '正式版'}
						</Chip>
						<p className='sr-only' id={descriptionId}>
							查看 StoneFlow 已发布版本的更新内容
						</p>
					</Modal.Header>

					<Modal.Body aria-label='更新日志内容' className='px-5 py-2 pb-5' role='region'>
						{isLoading ? (
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
							<div>
								{releases.map((release, index) => (
									<div
										className={index === 0 ? undefined : 'mt-7 border-t border-separator pt-7'}
										key={release.version}
										ref={release.version === focusVersion ? targetRef : undefined}
									>
										<ChangelogRelease release={release} />
									</div>
								))}
							</div>
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
					</Modal.Body>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}
