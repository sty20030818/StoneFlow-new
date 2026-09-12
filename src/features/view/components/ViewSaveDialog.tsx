import { Alert, Button, Input, Label, Modal } from '@heroui/react'
import { LayersIcon, XIcon } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { useRegisterSubmitTarget } from '@/features/submit'
import { ActionTooltip } from '@/shared/components/tooltip'

import type { ViewSaveFlow } from '../hooks/useViewSaveFlow'

type ViewSaveDialogProps = {
	flow: ViewSaveFlow
	canOverwrite: boolean
	onSave: (input: { mode: 'create' | 'overwrite'; name?: string }) => Promise<void>
}

/** 保存当前查询的命名与恢复界面；写入、导航和会话归 View flow。 */
export function ViewSaveDialog({ flow, canOverwrite, onSave }: ViewSaveDialogProps) {
	const [name, setName] = useState('')
	// 仅记住当前按钮位置，让写入转为打开恢复时不移除聚焦的按钮。
	const [submittedMode, setSubmittedMode] = useState<'create' | 'overwrite'>('create')
	const { open, sessionKey, pending, error, savedView, close, retryOpen } = flow
	const [session, setSession] = useState({ open, sessionKey })
	if (session.open !== open || session.sessionKey !== sessionKey) {
		setSession({ open, sessionKey })
		if (open) {
			setName('')
			setSubmittedMode('create')
		}
	}
	const canCreate = name.trim().length > 0
	const submit = useCallback(async () => {
		if (pending) return
		if (savedView) {
			await retryOpen()
			return
		}
		if (canCreate) {
			setSubmittedMode('create')
			await onSave({ mode: 'create', name: name.trim() })
		}
	}, [canCreate, name, onSave, pending, retryOpen, savedView])
	useRegisterSubmitTarget(
		useMemo(
			() =>
				open
					? {
							id: `view-save:${sessionKey}`,
							title: savedView ? '打开已保存视图' : '另存为视图',
							priority: 100,
							context: { source: 'view-save' },
							canSubmit: !pending && (Boolean(savedView) || canCreate),
							submit,
						}
					: null,
			[canCreate, open, pending, savedView, sessionKey, submit],
		),
	)

	return (
		<Modal.Backdrop isOpen={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
			<Modal.Container placement='center' scroll='inside'>
				<Modal.Dialog
					className='max-w-sm overflow-hidden'
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
							aria-label='关闭保存视图'
							className='absolute end-3 top-3'
							isIconOnly
							onPress={close}
							size='sm'
							type='button'
							variant='ghost'
						>
							<XIcon aria-hidden className='size-3.5' />
						</Button>
					</ActionTooltip>
					<form
						className='flex min-h-0 flex-col'
						onSubmit={(event) => {
							event.preventDefault()
							void submit()
						}}
					>
						<Modal.Header>
							<div className='flex items-center gap-2 ps-2 pe-10'>
								<LayersIcon aria-hidden className='size-4 shrink-0 text-muted' />
								<Modal.Heading>保存为视图</Modal.Heading>
							</div>
						</Modal.Header>
						<Modal.Body>
							<div className='grid gap-1.5 text-sm'>
								<Label htmlFor='filter-view-name'>视图名称</Label>
								<Input
									fullWidth
									id='filter-view-name'
									onChange={(event) => setName(event.currentTarget.value)}
									placeholder='例如：高优先级进行中'
									readOnly={Boolean(pending || savedView)}
									value={name}
								/>
							</div>
							<p className='text-xs text-muted'>
								保存当前查询范围、视图基线与筛选，不包含显示选项。
							</p>
							{error ? (
								<Alert role='alert' status='danger'>
									<Alert.Indicator />
									<Alert.Content className='min-w-0'>
										<Alert.Title>
											{error.kind === 'open' ? '已保存，但未能打开' : '保存失败'}
										</Alert.Title>
										<Alert.Description className='wrap-anywhere'>{error.message}</Alert.Description>
									</Alert.Content>
								</Alert>
							) : null}
						</Modal.Body>
						<Modal.Footer>
							<div className='flex w-full flex-wrap justify-end gap-2'>
								<Button onPress={close} type='button' variant='tertiary'>
									{savedView ? '关闭' : '取消'}
								</Button>
								{canOverwrite && (!savedView || submittedMode === 'overwrite') ? (
									<Button
										isDisabled={Boolean(
											pending && pending !== 'overwrite' && !(savedView && pending === 'open'),
										)}
										isPending={
											pending === 'overwrite' || (Boolean(savedView) && pending === 'open')
										}
										onPress={() => {
											if (pending) return
											if (savedView) void retryOpen()
											else {
												setSubmittedMode('overwrite')
												void onSave({ mode: 'overwrite' })
											}
										}}
										type='button'
										variant='secondary'
									>
										{savedView
											? '打开已保存视图'
											: error?.kind === 'write'
												? '重试覆盖'
												: '覆盖当前'}
									</Button>
								) : null}
								{!savedView || submittedMode === 'create' ? (
									<Button
										isDisabled={
											(!savedView && !canCreate) ||
											Boolean(pending && pending !== 'create' && pending !== 'open')
										}
										isPending={pending === 'create' || pending === 'open'}
										type='submit'
									>
										{savedView ? '打开已保存视图' : error?.kind === 'write' ? '重试保存' : '另存为'}
									</Button>
								) : null}
							</div>
						</Modal.Footer>
					</form>
				</Modal.Dialog>
			</Modal.Container>
		</Modal.Backdrop>
	)
}
