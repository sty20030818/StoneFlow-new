import { open as openDialog } from '@tauri-apps/plugin-dialog'
import { ExternalLink, File, Folder, Link2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { getSpaceLabel } from '@/app/layouts/shell/config'
import { INBOX_PRIORITY_OPTIONS } from '@/features/inbox/model/constants'
import { useTaskDrawer } from '@/features/task-drawer/model/useTaskDrawer'
import type { TaskDrawerResource } from '@/features/task-drawer/model/types'
import { Button } from '@/shared/ui/base/button'
import { Input } from '@/shared/ui/base/input'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/base/select'
import { Textarea } from '@/shared/ui/base/textarea'

type TaskDrawerContentProps = {
	currentSpaceId: string
	taskId: string
	onClose: () => void
}

const EMPTY_PRIORITY_VALUE = '__task-drawer-priority-empty__'
const EMPTY_PROJECT_VALUE = '__task-drawer-project-empty__'

/**
 * 真实 Task Drawer 内容，负责详情查询和基础字段编辑。
 */
export function TaskDrawerContent({ currentSpaceId, taskId, onClose }: TaskDrawerContentProps) {
	const {
		detail,
		draft,
		isDirty,
		isLoading,
		isSaving,
		isDeleting,
		isResourceLoading,
		isAddingResource,
		pendingResourceId,
		loadError,
		saveError,
		deleteError,
		resourceError,
		feedback,
		resourceFeedback,
		refresh,
		updateDraft,
		save,
		deleteTask,
		addResource,
		openResource,
		deleteResource,
	} = useTaskDrawer(currentSpaceId, taskId)
	const [docLinkTitle, setDocLinkTitle] = useState('')
	const [docLinkUrl, setDocLinkUrl] = useState('')

	if (isLoading) {
		return (
			<div className='space-y-3'>
				<p className='text-[12px] font-medium text-foreground'>正在加载任务详情...</p>
				<p className='text-[12px] leading-5 text-(--sf-color-shell-tertiary)'>
					会从 {getSpaceLabel(currentSpaceId)} 的真实数据中读取任务详情。
				</p>
			</div>
		)
	}

	if (loadError || !detail) {
		return (
			<div className='space-y-4'>
				<div
					className='rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2 text-[12px] leading-5 text-destructive'
					role='alert'
				>
					{loadError ?? '当前没有可展示的任务详情。'}
				</div>
				<div className='flex items-center justify-end gap-2'>
					<Button className='rounded-xl' onClick={() => void refresh()} variant='outline'>
						重试
					</Button>
					<Button className='rounded-xl' onClick={onClose} variant='ghost'>
						关闭
					</Button>
				</div>
			</div>
		)
	}

	const errorMessage = deleteError ?? saveError
	const canCreateDocLink = docLinkTitle.trim().length > 0 && docLinkUrl.trim().length > 0

	async function handleCreateDocLink() {
		const created = await addResource({
			type: 'doc_link',
			title: docLinkTitle,
			target: docLinkUrl,
		})

		if (created) {
			setDocLinkTitle('')
			setDocLinkUrl('')
		}
	}

	async function handleSelectLocalResource(type: 'local_file' | 'local_folder') {
		const selectedPath = await openDialog({
			directory: type === 'local_folder',
			multiple: false,
		})

		if (!selectedPath) {
			return
		}

		await addResource({
			type,
			title: getPathName(selectedPath),
			target: selectedPath,
		})
	}

	return (
		<div className='space-y-4'>
			<div className='space-y-1.5'>
				<p className='text-[12px] font-medium text-foreground'>任务详情</p>
				<p className='text-[12px] leading-5 text-(--sf-color-shell-tertiary)'>
					在 {getSpaceLabel(currentSpaceId)} 的主视图内直接编辑任务，不需要跳页。
				</p>
			</div>

			<div className='space-y-2'>
				<label className='space-y-1.5' htmlFor='task-drawer-title'>
					<span className='text-[11px] font-medium tracking-[0.03em] text-(--sf-color-shell-tertiary)'>
						标题
					</span>
					<Input
						autoFocus
						className='h-9 rounded-xl border-black/8 bg-black/2'
						disabled={isSaving}
						id='task-drawer-title'
						onChange={(event) => updateDraft({ title: event.currentTarget.value })}
						value={draft.title}
					/>
				</label>

				<label className='space-y-1.5' htmlFor='task-drawer-note'>
					<span className='text-[11px] font-medium tracking-[0.03em] text-(--sf-color-shell-tertiary)'>
						描述 / 备注
					</span>
					<Textarea
						className='min-h-24 rounded-xl border-black/8 bg-black/2'
						disabled={isSaving}
						id='task-drawer-note'
						onChange={(event) => updateDraft({ note: event.currentTarget.value })}
						placeholder='补充任务上下文、验收标准或当前判断。'
						value={draft.note}
					/>
				</label>
			</div>

			<div className='grid gap-3 md:grid-cols-2'>
				<label className='space-y-1.5'>
					<span className='text-[11px] font-medium tracking-[0.03em] text-(--sf-color-shell-tertiary)'>
						优先级
					</span>
					<Select
						disabled={isSaving}
						onValueChange={(value) =>
							updateDraft({
								priority: value === EMPTY_PRIORITY_VALUE ? '' : value,
							})
						}
						value={draft.priority || EMPTY_PRIORITY_VALUE}
					>
						<SelectTrigger
							aria-label='优先级'
							className='h-9 w-full rounded-xl border-black/8 bg-black/2'
							data-drawer-owned-overlay='true'
						>
							<SelectValue placeholder='待补齐' />
						</SelectTrigger>
						<SelectContent data-drawer-owned-overlay='true' position='popper'>
							<SelectGroup>
								<SelectItem value={EMPTY_PRIORITY_VALUE}>待补齐</SelectItem>
								{INBOX_PRIORITY_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</label>

				<label className='space-y-1.5'>
					<span className='text-[11px] font-medium tracking-[0.03em] text-(--sf-color-shell-tertiary)'>
						项目
					</span>
					<Select
						disabled={isSaving}
						onValueChange={(value) =>
							updateDraft({
								projectId: value === EMPTY_PROJECT_VALUE ? '' : value,
							})
						}
						value={draft.projectId || EMPTY_PROJECT_VALUE}
					>
						<SelectTrigger
							aria-label='项目'
							className='h-9 w-full rounded-xl border-black/8 bg-black/2'
							data-drawer-owned-overlay='true'
						>
							<SelectValue placeholder='未归类' />
						</SelectTrigger>
						<SelectContent data-drawer-owned-overlay='true' position='popper'>
							<SelectGroup>
								<SelectItem value={EMPTY_PROJECT_VALUE}>未归类</SelectItem>
								{detail.projects.map((project) => (
									<SelectItem key={project.id} value={project.id}>
										{project.name}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</label>

				<label className='space-y-1.5'>
					<span className='text-[11px] font-medium tracking-[0.03em] text-(--sf-color-shell-tertiary)'>
						状态
					</span>
					<Select
						disabled={isSaving}
						onValueChange={(value) =>
							updateDraft({
								status: value as 'todo' | 'done',
							})
						}
						value={draft.status}
					>
						<SelectTrigger
							aria-label='状态'
							className='h-9 w-full rounded-xl border-black/8 bg-black/2'
							data-drawer-owned-overlay='true'
						>
							<SelectValue placeholder='选择状态' />
						</SelectTrigger>
						<SelectContent data-drawer-owned-overlay='true' position='popper'>
							<SelectGroup>
								<SelectItem value='todo'>待执行</SelectItem>
								<SelectItem value='done'>已完成</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</label>
			</div>

			<section
				className='space-y-3 border-t border-black/6 pt-3'
				aria-labelledby='task-resources-title'
			>
				<div className='flex items-center justify-between gap-2'>
					<div className='space-y-1'>
						<h3 className='text-[12px] font-medium text-foreground' id='task-resources-title'>
							资源
						</h3>
						<p className='text-[12px] leading-5 text-(--sf-color-shell-tertiary)'>
							挂载与当前任务直接相关的链接、文件或文件夹。
						</p>
					</div>
					<div className='flex items-center gap-1.5'>
						<Button
							aria-label='选择文件'
							className='rounded-xl'
							disabled={isAddingResource}
							onClick={() => {
								void handleSelectLocalResource('local_file')
							}}
							size='icon-sm'
							title='选择文件'
							type='button'
							variant='outline'
						>
							<File />
						</Button>
						<Button
							aria-label='选择文件夹'
							className='rounded-xl'
							disabled={isAddingResource}
							onClick={() => {
								void handleSelectLocalResource('local_folder')
							}}
							size='icon-sm'
							title='选择文件夹'
							type='button'
							variant='outline'
						>
							<Folder />
						</Button>
					</div>
				</div>

				<div className='grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto]'>
					<Input
						aria-label='资源标题'
						className='h-8 rounded-xl border-black/8 bg-black/2 text-[12px]'
						disabled={isAddingResource}
						onChange={(event) => setDocLinkTitle(event.currentTarget.value)}
						placeholder='链接标题'
						value={docLinkTitle}
					/>
					<Input
						aria-label='资源 URL'
						className='h-8 rounded-xl border-black/8 bg-black/2 text-[12px]'
						disabled={isAddingResource}
						onChange={(event) => setDocLinkUrl(event.currentTarget.value)}
						placeholder='https://...'
						value={docLinkUrl}
					/>
					<Button
						className='rounded-xl'
						disabled={isAddingResource || !canCreateDocLink}
						onClick={() => void handleCreateDocLink()}
						size='sm'
						type='button'
					>
						<Plus data-icon='inline-start' />
						添加链接
					</Button>
				</div>

				<div className='space-y-2'>
					{isResourceLoading ? (
						<p className='rounded-xl border border-black/6 bg-black/3 px-3 py-2 text-[12px] text-(--sf-color-shell-tertiary)'>
							正在刷新资源...
						</p>
					) : null}

					{detail.resources.length === 0 ? (
						<p className='rounded-xl border border-dashed border-black/10 bg-black/2 px-3 py-3 text-[12px] leading-5 text-(--sf-color-shell-tertiary)'>
							暂无资源。
						</p>
					) : (
						<ul className='space-y-2'>
							{detail.resources.map((resource) => {
								const isPending = pendingResourceId === resource.id

								return (
									<li
										className='flex items-center gap-2 rounded-xl border border-black/6 bg-black/3 px-3 py-2'
										key={resource.id}
									>
										<div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-(--sf-color-shell-tertiary) shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]'>
											<ResourceIcon resource={resource} />
										</div>
										<div className='min-w-0 flex-1'>
											<p className='truncate text-[12px] font-medium text-foreground'>
												{resource.title}
											</p>
											<p className='truncate text-[11px] text-(--sf-color-shell-tertiary)'>
												{getResourceTypeLabel(resource.type)} · {getTargetSummary(resource.target)}
											</p>
										</div>
										<Button
											aria-label={`打开 ${resource.title}`}
											disabled={isPending}
											onClick={() => void openResource(resource.id)}
											size='icon-sm'
											title='打开资源'
											type='button'
											variant='ghost'
										>
											<ExternalLink />
										</Button>
										<Button
											aria-label={`移除 ${resource.title}`}
											disabled={isPending}
											onClick={() => void deleteResource(resource.id)}
											size='icon-sm'
											title='移除资源'
											type='button'
											variant='ghost'
										>
											<Trash2 />
										</Button>
									</li>
								)
							})}
						</ul>
					)}
				</div>

				{resourceError ? (
					<div
						className='rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2 text-[12px] leading-5 text-destructive'
						role='alert'
					>
						{resourceError}
					</div>
				) : null}

				{resourceFeedback ? (
					<div
						className='rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 text-[12px] leading-5 text-emerald-700'
						role='status'
					>
						{resourceFeedback}
					</div>
				) : null}
			</section>

			{errorMessage ? (
				<div
					className='rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2 text-[12px] leading-5 text-destructive'
					role='alert'
				>
					{errorMessage}
				</div>
			) : null}

			{feedback ? (
				<div
					className='rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 text-[12px] leading-5 text-emerald-700'
					role='status'
				>
					{feedback}
				</div>
			) : null}

			<div className='rounded-xl border border-black/6 bg-black/3 px-3 py-2'>
				<p className='text-[11px] text-(--sf-color-shell-tertiary)'>时间信息</p>
				<p className='mt-1 text-[12px] leading-5 text-foreground'>
					创建于 {new Date(detail.task.createdAt).toLocaleString('zh-CN')}
				</p>
				<p className='mt-1 text-[12px] leading-5 text-foreground'>
					更新于 {new Date(detail.task.updatedAt).toLocaleString('zh-CN')}
				</p>
				{detail.task.completedAt ? (
					<p className='mt-1 text-[12px] leading-5 text-foreground'>
						完成于 {new Date(detail.task.completedAt).toLocaleString('zh-CN')}
					</p>
				) : null}
			</div>

			<div className='rounded-xl border border-destructive/15 bg-destructive/4 px-3 py-2'>
				<p className='text-[11px] font-medium tracking-[0.03em] text-destructive'>删除任务</p>
				<p className='mt-1 text-[12px] leading-5 text-(--sf-color-shell-tertiary)'>
					删除后任务会从主列表中移除，并进入 Trash 数据层等待后续恢复能力接入。
				</p>
			</div>

			<div className='flex items-center justify-between gap-2'>
				<Button
					className='rounded-xl'
					disabled={isSaving || isDeleting}
					onClick={() => {
						void (async () => {
							const deleted = await deleteTask()

							if (deleted) {
								onClose()
							}
						})()
					}}
					variant='destructive'
				>
					{isDeleting ? '删除中...' : '删除任务'}
				</Button>

				<div className='flex items-center gap-2'>
					<Button
						className='rounded-xl'
						disabled={isSaving || isDeleting}
						onClick={onClose}
						variant='ghost'
					>
						关闭
					</Button>
					<Button
						className='rounded-xl'
						disabled={isLoading || isSaving || isDeleting || !isDirty}
						onClick={() => {
							void save()
						}}
					>
						{isSaving ? '保存中...' : '保存修改'}
					</Button>
				</div>
			</div>
		</div>
	)
}

function ResourceIcon({ resource }: { resource: TaskDrawerResource }) {
	if (resource.type === 'doc_link') {
		return <Link2 className='size-4' />
	}

	if (resource.type === 'local_folder') {
		return <Folder className='size-4' />
	}

	return <File className='size-4' />
}

function getResourceTypeLabel(type: TaskDrawerResource['type']) {
	switch (type) {
		case 'doc_link':
			return '链接'
		case 'local_file':
			return '文件'
		case 'local_folder':
			return '文件夹'
	}
}

function getTargetSummary(target: string) {
	if (target.startsWith('http://') || target.startsWith('https://')) {
		return target.replace(/^https?:\/\//, '')
	}

	return getPathName(target)
}

function getPathName(path: string) {
	const segments = path.split(/[\\/]/).filter(Boolean)

	return segments.at(-1) ?? path
}
