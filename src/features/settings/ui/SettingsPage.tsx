import { useEffect, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'

import { buildScopedSectionPath } from '@/app/layouts/shell/config'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import {
	selectSidebarSettings,
	selectSidebarSettingsError,
	selectSidebarSettingsStatus,
	useSidebarSettingsStore,
} from '@/app/layouts/shell/model/useSidebarSettingsStore'
import type { SidebarMainItemKey } from '@/features/settings/api/sidebarSettings'
import {
	selectSpaceError,
	selectSpaces,
	selectSpaceStatus,
	useSpaceStore,
} from '@/features/space/model/useSpaceStore'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { cn } from '@/shared/lib/utils'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
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
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { Settings2Icon } from 'lucide-react'

const MAIN_ITEM_OPTIONS: Array<{
	key: SidebarMainItemKey
	label: string
	description: string
}> = [
	{ key: 'inbox', label: 'Inbox', description: '保留任务收集入口，支持快速回到待整理列表。' },
	{ key: 'allTasks', label: 'All Tasks', description: '统一查看当前范围内全部任务。' },
	{ key: 'views', label: 'Views', description: '展示视图入口，承接列表和看板等任务视图。' },
	{
		key: 'projectOverview',
		label: 'Project Overview',
		description: '提供项目总览入口，便于按 Space 聚合查看项目。',
	},
]

type SettingsSectionKey = 'mainItems' | 'projectSection' | 'sidebarWidth' | 'defaultSpace'

type SectionStateMap = Record<SettingsSectionKey, boolean>
type SectionErrorMap = Partial<Record<SettingsSectionKey, string>>

/**
 * 阶段 11：设置页只负责组织现有 settings / space store，不复制配置状态。
 */
export function SettingsPage() {
	const { scope, spaceId } = useScopeRoute()
	const sidebarStatus = useSidebarSettingsStore(selectSidebarSettingsStatus)
	const sidebarSettings = useSidebarSettingsStore(selectSidebarSettings)
	const sidebarError = useSidebarSettingsStore(selectSidebarSettingsError)
	const loadSidebarSettings = useSidebarSettingsStore((state) => state.load)
	const setItemVisibility = useSidebarSettingsStore((state) => state.setItemVisibility)
	const setProjectSectionConfig = useSidebarSettingsStore((state) => state.setProjectSectionConfig)
	const setSidebarWidth = useSidebarSettingsStore((state) => state.setSidebarWidth)

	const spaces = useSpaceStore(selectSpaces)
	const spaceStatus = useSpaceStore(selectSpaceStatus)
	const spaceError = useSpaceStore(selectSpaceError)
	const loadSpaces = useSpaceStore((state) => state.load)
	const setDefaultSpace = useSpaceStore((state) => state.setDefaultSpace)

	const [sidebarWidthDraft, setSidebarWidthDraft] = useState('')
	const [pendingSections, setPendingSections] = useState<SectionStateMap>({
		mainItems: false,
		projectSection: false,
		sidebarWidth: false,
		defaultSpace: false,
	})
	const [sectionErrors, setSectionErrors] = useState<SectionErrorMap>({})

	useEffect(() => {
		void loadSidebarSettings().catch(() => undefined)
		void loadSpaces()
	}, [loadSidebarSettings, loadSpaces])

	useEffect(() => {
		if (!sidebarSettings) {
			return
		}

		setSidebarWidthDraft(String(sidebarSettings.width))
	}, [sidebarSettings])

	const visibleMainItemCount =
		sidebarSettings === null
			? 0
			: MAIN_ITEM_OPTIONS.filter((item) => sidebarSettings.mainItems[item.key].visible).length
	const defaultSpaceId = spaces.find((space) => space.isDefault)?.id ?? ''
	const isSettingsLoading =
		(sidebarStatus === 'idle' || sidebarStatus === 'loading') && sidebarSettings === null

	async function runSectionUpdate(section: SettingsSectionKey, task: () => Promise<void>) {
		setPendingSections((state) => ({
			...state,
			[section]: true,
		}))
		setSectionErrors((state) => ({
			...state,
			[section]: undefined,
		}))

		try {
			await task()
		} catch (error) {
			setSectionErrors((state) => ({
				...state,
				[section]: error instanceof Error ? error.message : '设置更新失败',
			}))
		} finally {
			setPendingSections((state) => ({
				...state,
				[section]: false,
			}))
		}
	}

	function handleMainItemVisibilityChange(key: SidebarMainItemKey, visible: boolean) {
		if (!sidebarSettings) {
			return
		}

		if (!visible && sidebarSettings.mainItems[key].visible && visibleMainItemCount === 1) {
			setSectionErrors((state) => ({
				...state,
				mainItems: '至少保留一个主入口，避免 Sidebar 没有可见导航项。',
			}))
			return
		}

		void runSectionUpdate('mainItems', async () => {
			await setItemVisibility({ kind: 'main', key }, visible)
		})
	}

	function handleProjectSectionChange(
		key: 'visible' | 'showCompleted' | 'showCounts',
		value: boolean,
	) {
		if (!sidebarSettings) {
			return
		}

		void runSectionUpdate('projectSection', async () => {
			await setProjectSectionConfig({
				...sidebarSettings.projectSection,
				[key]: value,
			})
		})
	}

	function handleSidebarWidthCommit() {
		if (!sidebarSettings) {
			return
		}

		const parsedWidth = Number(sidebarWidthDraft.trim())
		if (!Number.isInteger(parsedWidth) || parsedWidth <= 0) {
			setSidebarWidthDraft(String(sidebarSettings.width))
			setSectionErrors((state) => ({
				...state,
				sidebarWidth: '请输入大于 0 的整数宽度，失焦后会恢复到当前保存值。',
			}))
			return
		}

		if (parsedWidth === sidebarSettings.width) {
			setSectionErrors((state) => ({
				...state,
				sidebarWidth: undefined,
			}))
			return
		}

		void runSectionUpdate('sidebarWidth', async () => {
			await setSidebarWidth(parsedWidth)
		})
	}

	function handleSidebarWidthKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key !== 'Enter') {
			return
		}

		event.preventDefault()
		handleSidebarWidthCommit()
	}

	function handleDefaultSpaceChange(nextSpaceId: string) {
		if (!nextSpaceId || nextSpaceId === defaultSpaceId) {
			return
		}

		void runSectionUpdate('defaultSpace', async () => {
			await setDefaultSpace(nextSpaceId)
		})
	}

	return (
		<MainCard.Root>
			<MainCard.Header
					action={
						<Button asChild size='sm' variant='ghost'>
							<Link to={buildScopedSectionPath(scope, 'inbox', spaceId)}>返回收件箱</Link>
						</Button>
					}
					breadcrumb={
						<Breadcrumb>
							<BreadcrumbList className='text-sm font-semibold leading-5'>
								<BreadcrumbItem>
									<BreadcrumbPage className='inline-flex items-center gap-1.5'>
										<Settings2Icon
											aria-hidden
											className='size-4 shrink-0 text-(--sf-color-text-tertiary)'
										/>
										设置
									</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					}
				/>
			<MainCard.Body className='gap-4 p-4'>
				<StatusNotice
					description='阶段 11 只开放最小可用设置：侧边栏入口、Projects 分区、Sidebar 宽度和默认 Space。所有变更都会即时保存。'
					title='V1 页面设置'
				/>

				{isSettingsLoading ? (
					<StatusNotice
						description='正在读取 Sidebar 设置与可见 Space。'
						title='加载中'
						variant='warning'
					/>
				) : null}

				{sidebarStatus === 'error' && sidebarSettings === null ? (
					<StatusNotice
						actions={
							<Button
								onClick={() => {
									void loadSidebarSettings().catch(() => undefined)
								}}
								size='sm'
								type='button'
								variant='secondary'
							>
								重试
							</Button>
						}
						description={sidebarError ?? 'Sidebar 设置加载失败。'}
						layout='split'
						title='无法读取设置'
						variant='danger'
					/>
				) : null}

				{sidebarSettings ? (
					<>
						<SettingsSection
							description='控制 Shell 顶部主导航入口是否显示。至少保留一个主入口，避免侧边栏失去导航能力。'
							title='Sidebar 主入口'
						>
							<div className='grid gap-3 md:grid-cols-2'>
								{MAIN_ITEM_OPTIONS.map((item) => {
									const checked = sidebarSettings.mainItems[item.key].visible
									const disabled =
										pendingSections.mainItems || (checked && visibleMainItemCount === 1)

									return (
										<SettingCheckboxRow
											checked={checked}
											description={item.description}
											disabled={disabled}
											key={item.key}
											label={item.label}
											onChange={(nextChecked) =>
												handleMainItemVisibilityChange(item.key, nextChecked)
											}
										/>
									)
								})}
							</div>
							{sectionErrors.mainItems ? (
								<StatusNotice
									className='mt-4 text-[12px] leading-5'
									role='alert'
									size='sm'
									variant='danger'
								>
									{sectionErrors.mainItems}
								</StatusNotice>
							) : null}
						</SettingsSection>

						<SettingsSection
							description='只暴露 V1 真正会影响导航认知的 Projects 配置，不把 drawer、theme、density 混进本期。'
							title='Projects Section'
						>
							<div className='grid gap-3 md:grid-cols-3'>
								<SettingCheckboxRow
									checked={sidebarSettings.projectSection.visible}
									description='决定 Sidebar 中是否展示项目列表分区。'
									disabled={pendingSections.projectSection}
									label='显示 Projects'
									onChange={(nextChecked) => handleProjectSectionChange('visible', nextChecked)}
								/>
								<SettingCheckboxRow
									checked={sidebarSettings.projectSection.showCompleted}
									description='控制项目列表是否包含已完成项目。'
									disabled={pendingSections.projectSection}
									label='显示已完成项目'
									onChange={(nextChecked) =>
										handleProjectSectionChange('showCompleted', nextChecked)
									}
								/>
								<SettingCheckboxRow
									checked={sidebarSettings.projectSection.showCounts}
									description='控制项目列表是否显示任务数量徽标。'
									disabled={pendingSections.projectSection}
									label='显示数量'
									onChange={(nextChecked) => handleProjectSectionChange('showCounts', nextChecked)}
								/>
							</div>
							{sectionErrors.projectSection ? (
								<StatusNotice
									className='mt-4 text-[12px] leading-5'
									role='alert'
									size='sm'
									variant='danger'
								>
									{sectionErrors.projectSection}
								</StatusNotice>
							) : null}
						</SettingsSection>

						<SettingsSection
							description='输入桌面侧边栏宽度，按 Enter 或失焦后立即保存。服务端会做最终约束。'
							title='Sidebar Width'
						>
							<div className='flex flex-col gap-3 md:max-w-sm'>
								<label className='flex flex-col gap-1.5' htmlFor='sidebar-width'>
									<span className='text-[12px] font-medium text-foreground'>宽度（px）</span>
									<Input
										className='h-10'
										disabled={pendingSections.sidebarWidth}
										id='sidebar-width'
										inputMode='numeric'
										onBlur={handleSidebarWidthCommit}
										onChange={(event) => setSidebarWidthDraft(event.currentTarget.value)}
										onKeyDown={handleSidebarWidthKeyDown}
										placeholder='例如 256'
										value={sidebarWidthDraft}
									/>
								</label>
								<p className='text-[12px] leading-5 text-(--sf-color-shell-tertiary)'>
									当前保存值：{sidebarSettings.width}px
								</p>
							</div>
							{sectionErrors.sidebarWidth ? (
								<StatusNotice
									className='mt-4 text-[12px] leading-5'
									role='alert'
									size='sm'
									variant='danger'
								>
									{sectionErrors.sidebarWidth}
								</StatusNotice>
							) : null}
						</SettingsSection>
					</>
				) : null}

				<SettingsSection
					description='默认 Space 决定全局新建和兜底恢复时优先落点，本期直接复用现有 Space store。'
					title='默认 Space'
				>
					{spaceStatus === 'error' ? (
						<StatusNotice
							actions={
								<Button
									onClick={() => void loadSpaces()}
									size='sm'
									type='button'
									variant='secondary'
								>
									重试
								</Button>
							}
							description={spaceError ?? 'Space 列表加载失败。'}
							layout='split'
							title='无法读取 Space'
							variant='danger'
						/>
					) : spaces.length === 0 && spaceStatus === 'ready' ? (
						<StatusNotice
							description='当前没有可见 Space，暂时无法设置默认 Space。'
							title='暂无可用 Space'
						/>
					) : (
						<div className='flex flex-col gap-3 md:max-w-sm'>
							<label className='flex flex-col gap-1.5'>
								<span className='text-[12px] font-medium text-foreground'>选择默认 Space</span>
								<Select
									disabled={
										pendingSections.defaultSpace ||
										spaceStatus === 'loading' ||
										spaceStatus === 'idle' ||
										spaces.length === 0
									}
									onValueChange={handleDefaultSpaceChange}
									value={defaultSpaceId}
								>
									<SelectTrigger aria-label='默认 Space' className='h-10 w-full'>
										<SelectValue placeholder='选择默认 Space' />
									</SelectTrigger>
									<SelectContent position='popper'>
										<SelectGroup>
											{spaces.map((space) => (
												<SelectItem key={space.id} value={space.id}>
													{space.name}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</label>
							<p className='text-[12px] leading-5 text-(--sf-color-shell-tertiary)'>
								当前默认值：{spaces.find((space) => space.id === defaultSpaceId)?.name ?? '未设置'}
							</p>
						</div>
					)}
					{sectionErrors.defaultSpace ? (
						<StatusNotice
							className='mt-4 text-[12px] leading-5'
							role='alert'
							size='sm'
							variant='danger'
						>
							{sectionErrors.defaultSpace}
						</StatusNotice>
					) : null}
				</SettingsSection>
			</MainCard.Body>
		</MainCard.Root>
	)
}

function SettingsSection({
	title,
	description,
	children,
}: {
	title: string
	description: string
	children: React.ReactNode
}) {
	return (
		<section className='rounded-2xl border border-(--sf-color-border-subtle) bg-card p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)]'>
			<div className='mb-4 flex flex-col gap-1'>
				<h2 className='text-sm font-semibold text-foreground'>{title}</h2>
				<p className='text-[12px] leading-5 text-(--sf-color-shell-tertiary)'>{description}</p>
			</div>
			{children}
		</section>
	)
}

function SettingCheckboxRow({
	label,
	description,
	checked,
	disabled,
	onChange,
}: {
	label: string
	description: string
	checked: boolean
	disabled?: boolean
	onChange: (checked: boolean) => void
}) {
	const inputId = `setting-checkbox-${label.replace(/\s+/g, '-').toLowerCase()}`

	return (
		<label
			className={cn(
				'flex items-start gap-3 rounded-xl border border-(--sf-color-border-subtle) bg-muted/25 p-3 transition-colors',
				disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-muted/45',
			)}
			htmlFor={inputId}
		>
			<input
				checked={checked}
				className='mt-0.5 size-4 rounded border-(--sf-color-border-strong)'
				disabled={disabled}
				id={inputId}
				onChange={(event) => onChange(event.currentTarget.checked)}
				type='checkbox'
			/>
			<div className='min-w-0'>
				<p className='text-sm font-medium text-foreground'>{label}</p>
				<p className='mt-1 text-[12px] leading-5 text-(--sf-color-shell-tertiary)'>{description}</p>
			</div>
		</label>
	)
}
