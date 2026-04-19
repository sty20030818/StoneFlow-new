import { getSpaceLabel } from '@/app/layouts/shell/config'
import { INBOX_PRIORITY_OPTIONS } from '@/features/inbox/model/constants'
import { useTaskDrawer } from '@/features/task-drawer/model/useTaskDrawer'
import { Button } from '@/shared/ui/base/button'
import { Input } from '@/shared/ui/base/input'
import { Textarea } from '@/shared/ui/base/textarea'

type TaskDrawerContentProps = {
	currentSpaceId: string
	taskId: string
	onClose: () => void
}

/**
 * 真实 Task Drawer 内容，负责详情查询和基础字段编辑。
 */
export function TaskDrawerContent({
	currentSpaceId,
	taskId,
	onClose,
}: TaskDrawerContentProps) {
	const {
		detail,
		draft,
		isDirty,
		isLoading,
		isSaving,
		loadError,
		saveError,
		feedback,
		refresh,
		updateDraft,
		save,
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
					<select
						className='h-9 w-full rounded-xl border border-black/8 bg-black/2 px-3 text-sm text-foreground outline-none focus:border-ring'
						disabled={isSaving}
						onChange={(event) => updateDraft({ priority: event.currentTarget.value })}
						value={draft.priority}
					>
						<option value=''>待补齐</option>
						{INBOX_PRIORITY_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</label>

				<label className='space-y-1.5'>
					<span className='text-[11px] font-medium tracking-[0.03em] text-(--sf-color-shell-tertiary)'>
						项目
					</span>
					<select
						className='h-9 w-full rounded-xl border border-black/8 bg-black/2 px-3 text-sm text-foreground outline-none focus:border-ring'
						disabled={isSaving}
						onChange={(event) => updateDraft({ projectId: event.currentTarget.value })}
						value={draft.projectId}
					>
						<option value=''>未归类</option>
						{detail.projects.map((project) => (
							<option key={project.id} value={project.id}>
								{project.name}
							</option>
						))}
					</select>
				</label>

				<label className='space-y-1.5'>
					<span className='text-[11px] font-medium tracking-[0.03em] text-(--sf-color-shell-tertiary)'>
						状态
					</span>
					<select
						className='h-9 w-full rounded-xl border border-black/8 bg-black/2 px-3 text-sm text-foreground outline-none focus:border-ring'
						disabled={isSaving}
						onChange={(event) =>
							updateDraft({
								status: event.currentTarget.value as 'todo' | 'done',
							})
						}
						value={draft.status}
					>
						<option value='todo'>待执行</option>
						<option value='done'>已完成</option>
					</select>
				</label>
			</div>

			{saveError ? (
				<div
					className='rounded-xl border border-destructive/20 bg-destructive/8 px-3 py-2 text-[12px] leading-5 text-destructive'
					role='alert'
				>
					{saveError}
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

			<div className='flex items-center justify-end gap-2'>
				<Button className='rounded-xl' disabled={isSaving} onClick={onClose} variant='ghost'>
					关闭
				</Button>
				<Button
					className='rounded-xl'
					disabled={isLoading || isSaving || !isDirty}
					onClick={() => {
						void save()
					}}
				>
					{isSaving ? '保存中...' : '保存修改'}
				</Button>
			</div>
		</div>
	)
}
