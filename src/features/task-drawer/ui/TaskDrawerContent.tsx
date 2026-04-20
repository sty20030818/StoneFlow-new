import { getSpaceLabel } from '@/app/layouts/shell/config'
import { INBOX_PRIORITY_OPTIONS } from '@/features/inbox/model/constants'
import { useTaskDrawer } from '@/features/task-drawer/model/useTaskDrawer'
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
		loadError,
		saveError,
		deleteError,
		feedback,
		refresh,
		updateDraft,
		save,
		deleteTask,
	} = useTaskDrawer(currentSpaceId, taskId)

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
						>
							<SelectValue placeholder='待补齐' />
						</SelectTrigger>
						<SelectContent position='popper'>
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
						>
							<SelectValue placeholder='未归类' />
						</SelectTrigger>
						<SelectContent position='popper'>
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
						>
							<SelectValue placeholder='选择状态' />
						</SelectTrigger>
						<SelectContent position='popper'>
							<SelectGroup>
								<SelectItem value='todo'>待执行</SelectItem>
								<SelectItem value='done'>已完成</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</label>
			</div>

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
