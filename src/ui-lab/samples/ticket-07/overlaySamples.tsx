import { useState } from 'react'

import {
	AlertDialog,
	Button,
	Dropdown,
	Input,
	Label,
	Modal,
	Popover,
	TextField,
	Tooltip,
} from '@heroui/react'
import { ContextMenu, Sheet } from '@heroui-pro/react'

import type { UiLabSample } from '../../uiLabCatalog'

function FocusReturnNote({ closeAction, trigger }: { closeAction: string; trigger: string }) {
	return (
		<div className='rounded-lg border border-surface bg-surface-secondary p-3 text-xs leading-5 text-muted'>
			<p className='font-medium text-foreground'>关闭后焦点观察</p>
			<p>
				{closeAction} 后，焦点应返回“{trigger}”；观察触发点是否重新出现真实键盘焦点环。
			</p>
		</div>
	)
}

function TooltipPreview() {
	return (
		<div
			className='flex w-full max-w-2xl flex-col items-start gap-4'
			data-ui-lab-preview-root='tooltip'
		>
			<h3 className='text-base font-semibold'>Tooltip</h3>
			<p className='text-sm leading-6 text-muted'>
				关键信息始终显示在按钮下方；Tooltip 只补充非必要的快捷说明。
			</p>
			<Tooltip closeDelay={0} delay={300}>
				<Button type='button' variant='secondary'>
					查看整理提示
				</Button>
				<Tooltip.Content placement='bottom'>
					<p>也可以按 ⌘ K 打开命令面板</p>
				</Tooltip.Content>
			</Tooltip>
			<p className='text-sm'>整理任务前先确认 owner 与验证边界。</p>
			<p className='text-xs leading-5 text-muted'>
				用指针悬停或 Tab 聚焦触发；移开、失焦或按 Escape 关闭，记录组件真实行为。
			</p>
		</div>
	)
}

function DropdownPreview() {
	const [lastAction, setLastAction] = useState('尚未选择动作')

	return (
		<div
			className='flex w-full max-w-2xl flex-col items-start gap-4'
			data-ui-lab-preview-root='dropdown'
		>
			<h3 className='text-base font-semibold'>Dropdown</h3>
			<Dropdown>
				<Button type='button' variant='ghost'>
					打开任务菜单
				</Button>
				<Dropdown.Popover placement='bottom start'>
					<Dropdown.Menu
						aria-label='任务菜单'
						onAction={(key) => setLastAction(`已选择：${String(key)}`)}
					>
						<Dropdown.Item id='编辑任务' textValue='编辑任务'>
							<Label>编辑任务</Label>
						</Dropdown.Item>
						<Dropdown.Item id='复制链接' textValue='复制链接'>
							<Label>复制链接</Label>
						</Dropdown.Item>
						<Dropdown.Item id='移到废纸篓' textValue='移到废纸篓' variant='danger'>
							<Label>移到废纸篓</Label>
						</Dropdown.Item>
					</Dropdown.Menu>
				</Dropdown.Popover>
			</Dropdown>
			<p aria-live='polite' className='text-sm text-muted'>
				{lastAction}
			</p>
			<FocusReturnNote closeAction='选择动作或按 Escape' trigger='打开任务菜单' />
			<p className='text-xs leading-5 text-muted'>
				指针点击，或聚焦后按 Enter / Space / ArrowDown 打开；用方向键移动。
			</p>
		</div>
	)
}

function PopoverPreview() {
	const [open, setOpen] = useState(false)
	const [lastAction, setLastAction] = useState('尚未执行动作')

	return (
		<div
			className='flex w-full max-w-2xl flex-col items-start gap-4'
			data-ui-lab-preview-root='popover'
		>
			<h3 className='text-base font-semibold'>Popover</h3>
			<Popover isOpen={open} onOpenChange={setOpen}>
				<Button type='button' variant='secondary'>
					打开排序说明
				</Button>
				<Popover.Content className='w-[min(22rem,calc(100vw-2rem))]'>
					<Popover.Dialog aria-label='任务排序说明'>
						<Popover.Heading>任务排序说明</Popover.Heading>
						<p className='mt-2 text-sm leading-6 text-muted'>
							当前列表按截止日期排列；这里只修改本地观察文本。
						</p>
						<div className='mt-4 flex justify-end gap-2'>
							<Button onPress={() => setOpen(false)} type='button' variant='ghost'>
								关闭
							</Button>
							<Button
								onPress={() => {
									setLastAction('已模拟确认排序；没有写入业务状态。')
									setOpen(false)
								}}
								type='button'
							>
								确认排序
							</Button>
						</div>
					</Popover.Dialog>
				</Popover.Content>
			</Popover>
			<p aria-live='polite' className='text-sm text-muted'>
				{lastAction}
			</p>
			<FocusReturnNote closeAction='点“关闭”、确认、外点或按 Escape' trigger='打开排序说明' />
		</div>
	)
}

function ContextMenuPreview() {
	const [lastAction, setLastAction] = useState('尚未选择动作')

	return (
		<div
			className='flex w-full max-w-2xl flex-col items-start gap-4'
			data-ui-lab-preview-root='context-menu'
		>
			<h3 className='text-base font-semibold'>Context Menu</h3>
			<ContextMenu>
				<ContextMenu.Trigger tabIndex={0}>
					<div className='cursor-context-menu select-none rounded-lg border border-dashed border-border bg-surface-secondary px-5 py-8 text-sm'>
						右键打开；触屏设备长按 500ms
					</div>
				</ContextMenu.Trigger>
				<ContextMenu.Popover>
					<ContextMenu.Menu
						aria-label='任务上下文菜单'
						onAction={(key) => setLastAction(`已选择：${String(key)}`)}
					>
						<ContextMenu.Item id='重命名' textValue='重命名'>
							<Label>重命名</Label>
						</ContextMenu.Item>
						<ContextMenu.Item id='复制任务' textValue='复制任务'>
							<Label>复制任务</Label>
						</ContextMenu.Item>
						<ContextMenu.Separator />
						<ContextMenu.Item id='永久删除' textValue='永久删除' variant='danger'>
							<Label>永久删除</Label>
						</ContextMenu.Item>
					</ContextMenu.Menu>
				</ContextMenu.Popover>
			</ContextMenu>
			<p aria-live='polite' className='text-sm text-muted'>
				{lastAction}
			</p>
			<FocusReturnNote
				closeAction='选择动作、点到外部或按 Escape'
				trigger='右键打开；触屏设备长按 500ms'
			/>
		</div>
	)
}

function ModalPreview() {
	return (
		<div
			className='flex w-full max-w-2xl flex-col items-start gap-4'
			data-ui-lab-preview-root='modal'
		>
			<h3 className='text-base font-semibold'>Modal</h3>
			<Modal>
				<Button type='button' variant='secondary'>
					打开编辑 Modal
				</Button>
				<Modal.Backdrop>
					<Modal.Container size='sm'>
						<Modal.Dialog>
							<Modal.CloseTrigger aria-label='关闭编辑 Modal' />
							<Modal.Header>
								<Modal.Heading>编辑任务标题</Modal.Heading>
							</Modal.Header>
							<Modal.Body>
								<TextField defaultValue='整理 UI 审查结论' fullWidth name='modal-task-title'>
									<Label>任务标题</Label>
									<Input autoFocus fullWidth />
								</TextField>
								<p className='mt-3 text-xs leading-5 text-muted'>
									初始焦点应进入标题字段；用 Tab / Shift + Tab 检查焦点循环。
								</p>
							</Modal.Body>
							<Modal.Footer>
								<Button slot='close' type='button' variant='ghost'>
									取消
								</Button>
								<Button slot='close' type='button'>
									保存演示
								</Button>
							</Modal.Footer>
						</Modal.Dialog>
					</Modal.Container>
				</Modal.Backdrop>
			</Modal>
			<FocusReturnNote closeAction='点关闭、取消、保存、外点或按 Escape' trigger='打开编辑 Modal' />
		</div>
	)
}

function AlertDialogPreview() {
	const [lastAction, setLastAction] = useState('没有执行删除')

	return (
		<div
			className='flex w-full max-w-2xl flex-col items-start gap-4'
			data-ui-lab-preview-root='alert-dialog'
		>
			<h3 className='text-base font-semibold'>AlertDialog</h3>
			<AlertDialog>
				<Button type='button' variant='danger-soft'>
					打开删除确认
				</Button>
				<AlertDialog.Backdrop isKeyboardDismissDisabled={false}>
					<AlertDialog.Container>
						<AlertDialog.Dialog>
							<AlertDialog.Header>
								<AlertDialog.Icon status='danger' />
								<AlertDialog.Heading>永久删除这个演示任务？</AlertDialog.Heading>
							</AlertDialog.Header>
							<AlertDialog.Body>
								这是危险确认语义演示，不会删除数据。初始焦点应落在较安全的“保留任务”。
							</AlertDialog.Body>
							<AlertDialog.Footer>
								<Button
									autoFocus
									onPress={() => setLastAction('已保留任务')}
									slot='close'
									type='button'
									variant='tertiary'
								>
									保留任务
								</Button>
								<Button
									onPress={() => setLastAction('已模拟永久删除；没有数据被修改。')}
									slot='close'
									type='button'
									variant='danger'
								>
									永久删除
								</Button>
							</AlertDialog.Footer>
						</AlertDialog.Dialog>
					</AlertDialog.Container>
				</AlertDialog.Backdrop>
			</AlertDialog>
			<p aria-live='polite' className='text-sm text-muted'>
				{lastAction}
			</p>
			<FocusReturnNote closeAction='选择动作或按 Escape' trigger='打开删除确认' />
			<p className='text-xs leading-5 text-muted'>
				此 fixture 与 StoneFlow 现有危险确认一样允许 Escape；外点不关闭，必须明确退出。
			</p>
		</div>
	)
}

function SheetPreview() {
	return (
		<div
			className='flex w-full max-w-2xl flex-col items-start gap-4'
			data-ui-lab-preview-root='sheet'
		>
			<h3 className='text-base font-semibold'>Sheet</h3>
			<Sheet placement='right' shouldAutoFocus>
				<Sheet.Trigger>
					<Button type='button' variant='secondary'>
						打开 Sheet
					</Button>
				</Sheet.Trigger>
				<Sheet.Backdrop>
					<Sheet.Content className='w-[min(26rem,calc(100vw-1rem))]'>
						<Sheet.Dialog>
							<Sheet.CloseTrigger aria-label='关闭 Sheet' />
							<Sheet.Header>
								<Sheet.Heading>检查侧边编辑</Sheet.Heading>
							</Sheet.Header>
							<Sheet.Body>
								<p className='text-sm leading-6 text-muted'>
									这是独立的 HeroUI Pro Sheet；用 Tab / Shift + Tab 检查焦点循环，再按 Escape 关闭。
								</p>
							</Sheet.Body>
							<Sheet.Footer>
								<Sheet.Close>
									<Button autoFocus type='button' variant='secondary'>
										取消
									</Button>
								</Sheet.Close>
								<Sheet.Close>
									<Button type='button'>完成演示</Button>
								</Sheet.Close>
							</Sheet.Footer>
						</Sheet.Dialog>
					</Sheet.Content>
				</Sheet.Backdrop>
			</Sheet>
			<FocusReturnNote closeAction='点关闭、取消、完成、外点或按 Escape' trigger='打开 Sheet' />
		</div>
	)
}

function TaskDetailFocusPreview() {
	const [completed, setCompleted] = useState(false)

	return (
		<div
			className='flex w-full max-w-3xl flex-col items-start gap-4'
			data-ui-lab-preview-root='task-detail-focus'
		>
			<h3 className='text-base font-semibold'>Task Detail 焦点</h3>
			<p className='text-sm leading-6 text-muted'>
				这个无副作用场景只验证“打开—操作—关闭—恢复焦点”，不装配任务 Store、Query 或 Tauri。
			</p>
			<Sheet placement='right' shouldAutoFocus>
				<Sheet.Trigger>
					<Button type='button' variant='secondary'>
						打开任务详情
					</Button>
				</Sheet.Trigger>
				<Sheet.Backdrop>
					<Sheet.Content className='w-[min(26rem,calc(100vw-1rem))]'>
						<Sheet.Dialog>
							<Sheet.CloseTrigger aria-label='关闭任务详情' />
							<Sheet.Header>
								<Sheet.Heading>整理跨窗口焦点恢复与草稿保留的验证清单</Sheet.Heading>
							</Sheet.Header>
							<Sheet.Body>
								<p className='text-sm leading-6 text-muted'>
									状态：{completed ? '演示中已完成' : '演示中未完成'}。此状态只存在于当前预览。
								</p>
								<Button
									aria-pressed={completed}
									autoFocus
									className='mt-4'
									onPress={() => setCompleted((value) => !value)}
									type='button'
									variant='outline'
								>
									{completed ? '恢复为未完成' : '标记为已完成'}
								</Button>
							</Sheet.Body>
							<Sheet.Footer>
								<Sheet.Close>
									<Button type='button'>关闭任务详情</Button>
								</Sheet.Close>
							</Sheet.Footer>
						</Sheet.Dialog>
					</Sheet.Content>
				</Sheet.Backdrop>
			</Sheet>
			<FocusReturnNote closeAction='点关闭、外点或按 Escape' trigger='打开任务详情' />
			<div className='rounded-lg border border-surface bg-surface-secondary p-4 text-sm leading-6'>
				<p className='font-medium'>仅真实应用验证</p>
				<p className='mt-1 text-muted'>
					1024px 的 Aside / Sheet 切换、WebView 窗口边界、草稿保留、滚动恢复与业务数据装配。
				</p>
			</div>
		</div>
	)
}

export const TICKET_07_SAMPLES = [
	{
		id: 'stoneflow-tooltip',
		name: 'Tooltip',
		view: 'stoneflow',
		category: 'Overlays',
		description: '用真实 Hover / Focus 触发检查 Tooltip，同时保留所有必要信息的常驻文本。',
		keywords: ['tooltip', '提示', 'hover', 'focus', 'escape'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Closed、Hover Open、Focus Open、Escape、Blur',
		verification: 'Lab 可验证上游行为；产品延迟、截断与组合仅真实应用验证',
		Preview: TooltipPreview,
	},
	{
		id: 'stoneflow-dropdown',
		name: 'Dropdown',
		view: 'stoneflow',
		category: 'Overlays',
		description: '操作真实菜单按钮、方向键、危险项、Escape 与关闭后的焦点恢复。',
		keywords: ['dropdown', 'menu', '下拉菜单', '方向键', 'escape', 'focus restore'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Closed、Open、Focused、Danger、Action、Escape、Focus Restore',
		verification: 'Lab 可验证组件；业务命令执行仅真实应用验证',
		Preview: DropdownPreview,
	},
	{
		id: 'stoneflow-popover',
		name: 'Popover',
		view: 'stoneflow',
		category: 'Overlays',
		description: '操作包含真实可聚焦内容的 Popover，并观察显式关闭、外点、Escape 与焦点恢复。',
		keywords: ['popover', '浮层', 'dialog', 'escape', 'focus restore'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Closed、Open、Interactive、Outside Press、Escape、Focus Restore',
		verification: 'Lab 可验证组件；抽屉内 Portal 归属仅真实应用验证',
		Preview: PopoverPreview,
	},
	{
		id: 'stoneflow-context-menu',
		name: 'Context Menu',
		view: 'stoneflow',
		category: 'Overlays',
		description: '用右键、长按或键盘上下文菜单键打开真实 Context Menu，观察动作与退出路径。',
		keywords: ['context menu', '右键菜单', 'long press', 'shift f10', 'escape'],
		owner: 'HeroUI Pro',
		source: '@heroui-pro/react@1.0.0-beta.8',
		coverage: 'rendered',
		states: 'Closed、Pointer Open、Keyboard Open、Focused、Danger、Escape、Focus Restore',
		verification: 'Lab 可验证组件；Shell 嵌套菜单与业务动作仅真实应用验证',
		Preview: ContextMenuPreview,
	},
	{
		id: 'stoneflow-modal',
		name: 'Modal',
		view: 'stoneflow',
		category: 'Overlays',
		description: '检查真实 Modal 的初始字段焦点、Tab 循环、Escape、显式关闭与焦点恢复。',
		keywords: ['modal', 'dialog', '模态框', 'tab loop', 'escape', 'focus restore'],
		owner: 'HeroUI OSS',
		source: '@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Closed、Open、Initial Focus、Tab Loop、Escape、Focus Restore',
		verification: 'Lab 可验证组件；业务提交、WebView 与窗口边界仅真实应用验证',
		Preview: ModalPreview,
	},
	{
		id: 'stoneflow-alert-dialog',
		name: 'AlertDialog',
		view: 'stoneflow',
		category: 'Overlays',
		description: '检查真实危险确认语义、安全初始焦点、Tab 循环、Escape 与焦点恢复。',
		keywords: ['alertdialog', '危险确认', 'delete', 'tab loop', 'escape', 'focus restore'],
		owner: 'Danger confirmation feature',
		source: 'src/features/danger-confirm/index.ts；@heroui/react@3.2.4',
		coverage: 'rendered',
		states: 'Closed、Open、Danger、Safe Initial Focus、Tab Loop、Escape、Focus Restore',
		verification: 'Lab 可验证组件约定；真实删除与业务 copy 仅真实应用验证',
		Preview: AlertDialogPreview,
	},
	{
		id: 'stoneflow-sheet',
		name: 'Sheet',
		view: 'stoneflow',
		category: 'Overlays',
		description: '检查真实右侧 Sheet 的初始焦点、Tab 循环、Escape、外点关闭与焦点恢复。',
		keywords: ['sheet', '侧滑面板', 'drawer', 'tab loop', 'escape', 'focus restore'],
		owner: 'HeroUI Pro',
		source: '@heroui-pro/react@1.0.0-beta.8',
		coverage: 'rendered',
		states: 'Closed、Open、Initial Focus、Tab Loop、Outside Press、Escape、Focus Restore',
		verification: 'Lab 可验证组件；真实窗口 Portal 与嵌套 Overlay 仅真实应用验证',
		Preview: SheetPreview,
	},
	{
		id: 'stoneflow-task-detail-focus',
		name: 'Task Detail 焦点',
		view: 'stoneflow',
		category: 'Product Scenes',
		description: '以无副作用最小路径操作任务详情并观察关闭后的焦点恢复，同时登记真实应用边界。',
		keywords: ['task detail', '任务详情', 'focus restore', 'aside', 'sheet', 'webview', '草稿'],
		owner: 'Entity detail feature',
		source: 'src/features/entity-detail/index.ts；src/ui-lab/samples/ticket-07/overlaySamples.tsx',
		coverage: 'rendered',
		states: 'Closed、Open、Initial Focus、Local Action、Escape、Focus Restore、Long Copy、Narrow',
		verification: 'Lab 仅验证最小焦点路径；1024 Aside/Sheet、WebView、草稿与业务数据仅真实应用验证',
		Preview: TaskDetailFocusPreview,
	},
] as const satisfies readonly UiLabSample[]
