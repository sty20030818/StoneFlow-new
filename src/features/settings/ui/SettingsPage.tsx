import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { buildCanonicalSectionPath, useShellRoute } from '@/app/routing'
import { EntityScene } from '@/app/layouts/entity-scene'
import {
	selectSidebarSettings,
	selectSidebarSettingsError,
	selectSidebarSettingsStatus,
	useSidebarSettingsStore,
} from '@/app/layouts/shell/model/useSidebarSettingsStore'
import type { SidebarMainItemKey } from '@/features/settings/api/sidebarSettings'
import { useSetDefaultSpaceMutation, useSpaces } from '@/features/space/query'
import { cn } from '@/shared/lib/utils'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import { Button } from '@/shared/ui/base/button'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/shared/ui/base/select'
import {
	formFieldHintClass,
	formFieldLabelVariants,
	formFieldStackClass,
} from '@/shared/ui/patterns/form-field'
import { breadcrumbLeadClass, breadcrumbLeadIconClass } from '@/shared/ui/patterns/breadcrumb'
import {
	settingsPanelDescriptionClass,
	settingsPanelHeaderWrapClass,
	settingsPanelSectionClass,
	settingsPanelTitleClass,
} from '@/shared/ui/patterns/settings-panel'
import { statusNoticeCompactTextClass } from '@/shared/ui/patterns/status-notice'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { Settings2Icon } from 'lucide-react'

const MAIN_ITEM_OPTIONS: Array<{
	key: SidebarMainItemKey
	label: string
	description: string
}> = [
	{ key: 'inbox', label: '收件箱', description: '保留任务收集入口，方便快速回到待整理列表。' },
	{ key: 'allTasks', label: '所有任务', description: '统一查看当前范围内的全部任务。' },
	{ key: 'views', label: '视图', description: '保留视图入口，方便按条件聚焦任务。' },
	{
		key: 'projectOverview',
		label: '项目总览',
		description: '保留项目入口，方便集中查看和管理项目。',
	},
]

type SettingsSectionKey = 'mainItems' | 'footerItems' | 'projectSection' | 'defaultSpace'

type SectionStateMap = Record<SettingsSectionKey, boolean>
type SectionErrorMap = Partial<Record<SettingsSectionKey, string>>

/**
 * 设置页只负责组织现有 settings 状态与 Space 数据，不复制配置状态。
 */
export function SettingsPage() {
	const shellRoute = useShellRoute()
	const scope = shellRoute.scope ?? { type: 'all' as const }
	const fallbackSpaceId = shellRoute.spaceId
	const sidebarStatus = useSidebarSettingsStore(selectSidebarSettingsStatus)
	const sidebarSettings = useSidebarSettingsStore(selectSidebarSettings)
	const sidebarError = useSidebarSettingsStore(selectSidebarSettingsError)
	const loadSidebarSettings = useSidebarSettingsStore((state) => state.load)
	const setItemVisibility = useSidebarSettingsStore((state) => state.setItemVisibility)
	const setProjectSectionConfig = useSidebarSettingsStore((state) => state.setProjectSectionConfig)

	const { spaces, status: spaceStatus, error: spaceError, refetch: refetchSpaces } = useSpaces()
	const setDefaultSpace = useSetDefaultSpaceMutation()

	const [pendingSections, setPendingSections] = useState<SectionStateMap>({
		mainItems: false,
		footerItems: false,
		projectSection: false,
		defaultSpace: false,
	})
	const [sectionErrors, setSectionErrors] = useState<SectionErrorMap>({})

	useEffect(() => {
		void loadSidebarSettings().catch(() => undefined)
	}, [loadSidebarSettings])

	const visibleMainItemCount =
		sidebarSettings === null
			? 0
			: MAIN_ITEM_OPTIONS.filter((item) => sidebarSettings.mainItems[item.key].visible).length
	const visibleFooterItemCount =
		sidebarSettings === null
			? 0
			: (sidebarSettings.footerItems.archive.visible ? 1 : 0) +
				(sidebarSettings.footerItems.trash.visible ? 1 : 0)
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

	function handleFooterItemVisibilityChange(key: 'archive' | 'trash', visible: boolean) {
		if (!sidebarSettings) {
			return
		}

		if (!visible && sidebarSettings.footerItems[key].visible && visibleFooterItemCount === 1) {
			setSectionErrors((state) => ({
				...state,
				footerItems: '至少保留一个辅助入口，避免底部区域完全消失。',
			}))
			return
		}

		void runSectionUpdate('footerItems', async () => {
			await setItemVisibility({ kind: 'footer', key }, visible)
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

	function handleDefaultSpaceChange(nextSpaceId: string) {
		if (!nextSpaceId || nextSpaceId === defaultSpaceId) {
			return
		}

		void runSectionUpdate('defaultSpace', async () => {
			await setDefaultSpace.mutateAsync(nextSpaceId)
		})
	}

	return (
		<EntityScene
			breadcrumb={
				<Breadcrumb>
					<BreadcrumbList className='text-sm font-semibold leading-5'>
						<BreadcrumbItem>
							<BreadcrumbPage className={breadcrumbLeadClass}>
								<Settings2Icon aria-hidden className={breadcrumbLeadIconClass} />
								设置
							</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			}
			beforeBoard={
				<div className='flex flex-col gap-4'>
					{sidebarSettings ? (
						<>
							<SettingsSection
								description='控制侧边栏主导航里哪些入口显示。至少保留一个主入口，避免侧边栏失去基本导航能力。'
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
										className={`mt-4 ${statusNoticeCompactTextClass}`}
										role='alert'
										size='sm'
										variant='danger'
									>
										{sectionErrors.mainItems}
									</StatusNotice>
								) : null}
							</SettingsSection>

							<SettingsSection
								description='控制底部辅助入口是否显示，方便决定归档和回收站要不要常驻侧边栏。'
								title='辅助入口'
							>
								<div className='grid gap-3 md:grid-cols-2'>
									<SettingCheckboxRow
										checked={sidebarSettings.footerItems.archive.visible}
										description='显示归档入口，方便集中查看暂时收起的内容。'
										disabled={
											pendingSections.footerItems ||
											(sidebarSettings.footerItems.archive.visible && visibleFooterItemCount === 1)
										}
										label='归档'
										onChange={(nextChecked) =>
											handleFooterItemVisibilityChange('archive', nextChecked)
										}
									/>
									<SettingCheckboxRow
										checked={sidebarSettings.footerItems.trash.visible}
										description='显示回收站入口，方便恢复或彻底删除内容。'
										disabled={
											pendingSections.footerItems ||
											(sidebarSettings.footerItems.trash.visible && visibleFooterItemCount === 1)
										}
										label='回收站'
										onChange={(nextChecked) =>
											handleFooterItemVisibilityChange('trash', nextChecked)
										}
									/>
								</div>
								{sectionErrors.footerItems ? (
									<StatusNotice
										className={`mt-4 ${statusNoticeCompactTextClass}`}
										role='alert'
										size='sm'
										variant='danger'
									>
										{sectionErrors.footerItems}
									</StatusNotice>
								) : null}
							</SettingsSection>

							<SettingsSection
								description='控制项目分区在侧边栏里的呈现方式，只保留真正会影响日常导航的几项。'
								title='项目分区'
							>
								<div className='grid gap-3 md:grid-cols-3'>
									<SettingCheckboxRow
										checked={sidebarSettings.projectSection.visible}
										description='决定侧边栏中是否展示项目分区。'
										disabled={pendingSections.projectSection}
										label='显示项目分区'
										onChange={(nextChecked) => handleProjectSectionChange('visible', nextChecked)}
									/>
									<SettingCheckboxRow
										checked={sidebarSettings.projectSection.showCompleted}
										description='控制项目分区里是否包含已完成项目。'
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
										onChange={(nextChecked) =>
											handleProjectSectionChange('showCounts', nextChecked)
										}
									/>
								</div>
								{sectionErrors.projectSection ? (
									<StatusNotice
										className={`mt-4 ${statusNoticeCompactTextClass}`}
										role='alert'
										size='sm'
										variant='danger'
									>
										{sectionErrors.projectSection}
									</StatusNotice>
								) : null}
							</SettingsSection>
						</>
					) : null}

					<SettingsSection
						description='默认空间会影响全局新建和兜底恢复时的优先落点，建议把最常用的空间放在这里。'
						title='默认空间'
					>
						{spaceStatus === 'error' ? (
							<StatusNotice
								actions={
									<Button
										onClick={() => void refetchSpaces()}
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
								description='当前还没有可用空间，所以暂时不能设置默认项。等空间准备好之后，再回来这里调整就可以了。'
								title='当前没有可用空间'
							/>
						) : (
							<div className='flex flex-col gap-3 md:max-w-sm'>
								<label className={formFieldStackClass}>
									<span className={formFieldLabelVariants()}>选择默认空间</span>
									<Select
										disabled={
											pendingSections.defaultSpace ||
											spaceStatus === 'loading' ||
											spaces.length === 0
										}
										onValueChange={handleDefaultSpaceChange}
										value={defaultSpaceId}
									>
										<SelectTrigger aria-label='默认空间' className='h-10 w-full'>
											<SelectValue placeholder='选择默认空间' />
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
								<p className={formFieldHintClass}>
									当前默认项：
									{spaces.find((space) => space.id === defaultSpaceId)?.name ?? '未设置'}
								</p>
							</div>
						)}
						{sectionErrors.defaultSpace ? (
							<StatusNotice
								className={`mt-4 ${statusNoticeCompactTextClass}`}
								role='alert'
								size='sm'
								variant='danger'
							>
								{sectionErrors.defaultSpace}
							</StatusNotice>
						) : null}
					</SettingsSection>
				</div>
			}
			bodyClassName='gap-4 p-2'
			headerActions={
				<Button asChild size='sm' variant='ghost'>
					<Link to={buildCanonicalSectionPath(scope, 'tasks', fallbackSpaceId)}>返回所有任务</Link>
				</Button>
			}
			notices={
				<>
					<StatusNotice
						description='这里先只开放会影响日常导航和默认落点的设置。所有变更都会立即保存，不需要额外确认。'
						title='工作区设置'
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
				</>
			}
			sceneVariant='settings'
		/>
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
		<section className={settingsPanelSectionClass}>
			<div className={settingsPanelHeaderWrapClass}>
				<h2 className={settingsPanelTitleClass}>{title}</h2>
				<p className={settingsPanelDescriptionClass}>{description}</p>
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
				'flex items-start gap-3 rounded-xl border border-sf-border-subtle bg-muted/25 p-3 transition-colors',
				disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-muted/45',
			)}
			htmlFor={inputId}
		>
			<input
				checked={checked}
				className='mt-0.5 size-4 rounded border-sf-border-strong'
				disabled={disabled}
				id={inputId}
				onChange={(event) => onChange(event.currentTarget.checked)}
				type='checkbox'
			/>
			<div className='min-w-0'>
				<p className='text-sm font-medium text-foreground'>{label}</p>
				<p className={formFieldHintClass}>{description}</p>
			</div>
		</label>
	)
}
