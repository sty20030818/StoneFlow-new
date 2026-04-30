import { useMemo, useState } from 'react'
import { ExternalLink, File, Folder, Link2, Trash2 } from 'lucide-react'

import {
	getProjectOptions,
	getTaskRecord,
	getTaskResources,
	type TaskResource,
} from '@/features/workspace'
import {
	EMPTY_TASK_PRIORITY_VALUE,
	TASK_PRIORITY_OPTIONS,
	type TaskPriorityValue,
} from '@/features/task/model/taskPriority'
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
import { StatusNotice } from '@/shared/ui/StatusNotice'

type TaskDrawerContentProps = {
	currentSpaceLabel: string
	taskId: string
	onClose: () => void
}

const EMPTY_PROJECT_VALUE = '__task-drawer-project-empty__'
const DRAWER_FIELD_CLASS = 'rounded-md border-input bg-card'
const DRAWER_SECTION_CLASS = 'rounded-lg border border-(--sf-color-border-subtle) bg-muted/35'
const DRAWER_HELP_CLASS =
	'rounded-lg border border-(--sf-color-border-subtle) bg-muted/60 px-3 py-2 text-[12px] text-(--sf-color-shell-tertiary)'
const DRAWER_SECTION_TITLE_CLASS =
	'text-[11px] font-medium tracking-[0.06em] text-(--sf-color-shell-tertiary) uppercase'

/**
 * 保留任务详情抽屉的完整表单与资源区块，数据来自本地 mock。
 */
export function TaskDrawerContent({ currentSpaceLabel, taskId, onClose }: TaskDrawerContentProps) {
	const task = getTaskRecord(taskId)
	const projectOptions = getProjectOptions()
	const initialResources = useMemo(() => getTaskResources(taskId), [taskId])
	const [draftTitle, setDraftTitle] = useState(task?.title ?? '')
	const [draftNote, setDraftNote] = useState(task?.note ?? '')
	const [draftPriority, setDraftPriority] = useState<TaskPriorityValue>(task?.priority ?? '')
	const [draftProjectId, setDraftProjectId] = useState(task?.projectId ?? '')
	const [draftStatus, setDraftStatus] = useState<'todo' | 'done'>(task?.status ?? 'todo')
	const [docLinkTitle, setDocLinkTitle] = useState('')
	const [docLinkUrl, setDocLinkUrl] = useState('')
	const [resources, setResources] = useState<TaskResource[]>(initialResources)
	const [lastAction, setLastAction] = useState('已保留任务详情编辑 UI。')

	if (!task) {
		return (
			<div className='space-y-4'>
				<StatusNotice className='text-[12px] leading-5' role='alert' size='sm' variant='danger'>
					当前没有可展示的任务详情。
				</StatusNotice>
				<div className='flex items-center justify-end gap-2'>
					<Button className='rounded-md' onClick={onClose} variant='ghost'>
						关闭
					</Button>
				</div>
			</div>
		)
	}

	const canCreateDocLink = docLinkTitle.trim().length > 0 && docLinkUrl.trim().length > 0

	function handleAddDocLink() {
		if (!canCreateDocLink) {
			return
		}

		setResources((currentResources) => [
			...currentResources,
			{
				id: `resource-${Date.now()}`,
				type: 'doc_link',
				title: docLinkTitle.trim(),
				target: docLinkUrl.trim(),
			},
		])
		setDocLinkTitle('')
		setDocLinkUrl('')
		setLastAction('已添加一个本地 mock 文档链接。')
	}

	function handleDeleteResource(resourceId: string) {
		setResources((currentResources) =>
			currentResources.filter((resource) => resource.id !== resourceId),
		)
		setLastAction('已从抽屉中移除一个 mock 资源。')
	}

	function handleSave() {
		setLastAction('已保存本地 mock 编辑结果，真实详情写入将在后续阶段接入。')
	}

	return (
		<div className='space-y-4'>
			<div className='space-y-1.5'>
				<p className={DRAWER_SECTION_TITLE_CLASS}>任务详情</p>
					<p className='text-[12px] leading-5 text-(--sf-color-shell-tertiary)'>
						在 {currentSpaceLabel} 的主视图内直接编辑任务，不需要跳页。
					</p>
			</div>

			<div className={`${DRAWER_SECTION_CLASS} space-y-3 px-3.5 py-3.5`}>
				<label className='space-y-1.5' htmlFor='task-drawer-title'>
					<span className={DRAWER_SECTION_TITLE_CLASS}>标题</span>
					<Input
						autoFocus
						className={`h-9 ${DRAWER_FIELD_CLASS}`}
						id='task-drawer-title'
						onChange={(event) => setDraftTitle(event.currentTarget.value)}
						value={draftTitle}
					/>
				</label>

				<label className='space-y-1.5' htmlFor='task-drawer-note'>
					<span className={DRAWER_SECTION_TITLE_CLASS}>描述 / 备注</span>
					<Textarea
						className={`min-h-24 ${DRAWER_FIELD_CLASS}`}
						id='task-drawer-note'
						onChange={(event) => setDraftNote(event.currentTarget.value)}
						placeholder='补充任务上下文、验收标准或当前判断。'
						value={draftNote}
					/>
				</label>
			</div>

			<div className={`${DRAWER_SECTION_CLASS} grid gap-3 px-3.5 py-3.5 md:grid-cols-2`}>
				<label className='space-y-1.5'>
					<span className={DRAWER_SECTION_TITLE_CLASS}>优先级</span>
					<Select
						onValueChange={(value) =>
							setDraftPriority(
								value === EMPTY_TASK_PRIORITY_VALUE ? '' : (value as TaskPriorityValue),
							)
						}
						value={draftPriority || EMPTY_TASK_PRIORITY_VALUE}
					>
						<SelectTrigger
							aria-label='优先级'
							className={`h-9 w-full ${DRAWER_FIELD_CLASS}`}
							data-drawer-owned-overlay='true'
						>
							<SelectValue placeholder='待补齐' />
						</SelectTrigger>
						<SelectContent data-drawer-owned-overlay='true' position='popper'>
							<SelectGroup>
								{TASK_PRIORITY_OPTIONS.map((option) => (
									<SelectItem
										key={option.value || EMPTY_TASK_PRIORITY_VALUE}
										value={option.value || EMPTY_TASK_PRIORITY_VALUE}
									>
										{option.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</label>

				<label className='space-y-1.5'>
					<span className={DRAWER_SECTION_TITLE_CLASS}>项目</span>
					<Select
						onValueChange={(value) => setDraftProjectId(value === EMPTY_PROJECT_VALUE ? '' : value)}
						value={draftProjectId || EMPTY_PROJECT_VALUE}
					>
						<SelectTrigger
							aria-label='项目'
							className={`h-9 w-full ${DRAWER_FIELD_CLASS}`}
							data-drawer-owned-overlay='true'
						>
							<SelectValue placeholder='未归类' />
						</SelectTrigger>
						<SelectContent data-drawer-owned-overlay='true' position='popper'>
							<SelectGroup>
								<SelectItem value={EMPTY_PROJECT_VALUE}>未归类</SelectItem>
								{projectOptions.map((project) => (
									<SelectItem key={project.id} value={project.id}>
										{project.name}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</label>

				<label className='space-y-1.5'>
					<span className={DRAWER_SECTION_TITLE_CLASS}>状态</span>
					<Select
						onValueChange={(value) => setDraftStatus(value as 'todo' | 'done')}
						value={draftStatus}
					>
						<SelectTrigger
							aria-label='状态'
							className={`h-9 w-full ${DRAWER_FIELD_CLASS}`}
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

				<div className='space-y-1.5'>
					<span className={DRAWER_SECTION_TITLE_CLASS}>更新时间</span>
					<div
						className={`flex h-9 items-center rounded-md px-3 text-[12px] text-(--sf-color-shell-secondary) ${DRAWER_FIELD_CLASS}`}
					>
						{task.updatedLabel}
					</div>
				</div>
			</div>

			<div className={`${DRAWER_SECTION_CLASS} space-y-3 px-3.5 py-3.5`}>
				<div className='flex items-center justify-between gap-3'>
					<div>
						<p className={DRAWER_SECTION_TITLE_CLASS}>资源</p>
						<p className='mt-1 text-[12px] leading-5 text-(--sf-color-shell-tertiary)'>
							保留文档、文件夹和链接的列表样式，后续阶段再接入真实资源能力。
						</p>
					</div>
					<Button className='rounded-md' onClick={handleSave} size='sm' variant='outline'>
						保存
					</Button>
				</div>

				<div className='space-y-2'>
					{resources.map((resource) => (
						<ResourceRow
							key={resource.id}
							onDelete={() => handleDeleteResource(resource.id)}
							resource={resource}
						/>
					))}
				</div>

				<div className='grid gap-2 md:grid-cols-[1fr_1.2fr_auto]'>
					<Input
						className={`h-9 ${DRAWER_FIELD_CLASS}`}
						onChange={(event) => setDocLinkTitle(event.currentTarget.value)}
						placeholder='链接标题'
						value={docLinkTitle}
					/>
					<Input
						className={`h-9 ${DRAWER_FIELD_CLASS}`}
						onChange={(event) => setDocLinkUrl(event.currentTarget.value)}
						placeholder='https://example.com'
						value={docLinkUrl}
					/>
					<Button
						className='rounded-md'
						disabled={!canCreateDocLink}
						onClick={handleAddDocLink}
						type='button'
					>
						添加链接
					</Button>
				</div>
			</div>

			<div className={DRAWER_HELP_CLASS}>{lastAction}</div>

			<div className='flex items-center justify-between gap-2'>
				<Button className='rounded-md' type='button' variant='ghost'>
					<Trash2 />
					移入回收站
				</Button>
				<div className='flex items-center gap-2'>
					<Button className='rounded-md' onClick={onClose} type='button' variant='ghost'>
						关闭
					</Button>
					<Button className='rounded-md' onClick={handleSave} type='button'>
						保存修改
					</Button>
				</div>
			</div>
		</div>
	)
}

function ResourceRow({ resource, onDelete }: { resource: TaskResource; onDelete: () => void }) {
	const ResourceIcon =
		resource.type === 'doc_link' ? Link2 : resource.type === 'local_folder' ? Folder : File

	return (
		<div className='flex items-center gap-3 rounded-lg border border-(--sf-color-border-subtle) bg-card px-3 py-2.5'>
			<div className='flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-(--sf-color-shell-secondary)'>
				<ResourceIcon className='size-4' />
			</div>
			<div className='min-w-0 flex-1'>
				<p className='truncate text-sm font-medium text-foreground'>{resource.title}</p>
				<p className='truncate text-[12px] text-(--sf-color-shell-tertiary)'>{resource.target}</p>
			</div>
			<Button className='rounded-md' size='icon-sm' type='button' variant='ghost'>
				<ExternalLink className='size-3.5' />
			</Button>
			<Button
				className='rounded-md'
				onClick={onDelete}
				size='icon-sm'
				type='button'
				variant='ghost'
			>
				<Trash2 className='size-3.5' />
			</Button>
		</div>
	)
}
