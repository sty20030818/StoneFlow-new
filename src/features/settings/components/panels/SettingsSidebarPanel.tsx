import { useEffect, useState } from 'react'
import { Alert, Button, Spinner } from '@heroui/react'

import {
	selectSidebarSettings,
	selectSidebarSettingsError,
	selectSidebarSettingsStatus,
	useSidebarSettingsStore,
} from '../../model/useSidebarSettingsStore'
import type { SidebarMainItemKey } from '../../api/sidebarSettings'
import {
	SettingsPreferenceGroup,
	SettingsSection,
	SettingsStack,
	SettingsToggleRow,
} from '../settingsShared'

const MAIN_ITEM_OPTIONS: Array<{
	key: SidebarMainItemKey
	label: string
	description: string
}> = [
	{ key: 'allTasks', label: '所有任务', description: '统一查看当前范围内的全部任务。' },
	{ key: 'views', label: '视图', description: '保留视图入口，方便按条件聚焦任务。' },
	{
		key: 'projectOverview',
		label: '项目总览',
		description: '保留项目入口，方便集中查看和管理项目。',
	},
]

type PanelSectionKey = 'mainItems' | 'footerItems' | 'projectSection'

/**
 * 侧边栏可见性与项目分区设置。
 */
export function SettingsSidebarPanel() {
	const sidebarStatus = useSidebarSettingsStore(selectSidebarSettingsStatus)
	const sidebarSettings = useSidebarSettingsStore(selectSidebarSettings)
	const sidebarError = useSidebarSettingsStore(selectSidebarSettingsError)
	const loadSidebarSettings = useSidebarSettingsStore((state) => state.load)
	const setItemVisibility = useSidebarSettingsStore((state) => state.setItemVisibility)
	const setProjectSectionConfig = useSidebarSettingsStore((state) => state.setProjectSectionConfig)

	const [pendingSections, setPendingSections] = useState<Record<PanelSectionKey, boolean>>({
		mainItems: false,
		footerItems: false,
		projectSection: false,
	})
	const [sectionErrors, setSectionErrors] = useState<Partial<Record<PanelSectionKey, string>>>({})

	useEffect(() => {
		void loadSidebarSettings().catch(() => undefined)
	}, [loadSidebarSettings])

	const isSettingsLoading =
		(sidebarStatus === 'idle' || sidebarStatus === 'loading') && sidebarSettings === null

	const visibleMainItemCount =
		sidebarSettings === null
			? 0
			: MAIN_ITEM_OPTIONS.filter((item) => sidebarSettings.mainItems[item.key].visible).length
	const visibleFooterItemCount =
		sidebarSettings === null
			? 0
			: (sidebarSettings.footerItems.archive.visible ? 1 : 0) +
				(sidebarSettings.footerItems.trash.visible ? 1 : 0)

	async function runSectionUpdate(section: PanelSectionKey, task: () => Promise<void>) {
		setPendingSections((state) => ({ ...state, [section]: true }))
		setSectionErrors((state) => ({ ...state, [section]: undefined }))
		try {
			await task()
		} catch (error) {
			setSectionErrors((state) => ({
				...state,
				[section]: error instanceof Error ? error.message : '设置更新失败',
			}))
		} finally {
			setPendingSections((state) => ({ ...state, [section]: false }))
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

	if (isSettingsLoading) {
		return (
			<Alert aria-busy='true' aria-live='polite' role='status' status='accent'>
				<Alert.Indicator>
					<Spinner aria-hidden='true' color='current' size='sm' />
				</Alert.Indicator>
				<Alert.Content>
					<Alert.Title>加载中</Alert.Title>
					<Alert.Description>正在读取 Sidebar 设置。</Alert.Description>
				</Alert.Content>
			</Alert>
		)
	}

	if (sidebarStatus === 'error' && sidebarSettings === null) {
		return (
			<Alert role='alert' status='danger'>
				<Alert.Indicator />
				<Alert.Content>
					<Alert.Title>无法读取设置</Alert.Title>
					<Alert.Description>{sidebarError ?? 'Sidebar 设置加载失败。'}</Alert.Description>
				</Alert.Content>
				<Button
					onPress={() => void loadSidebarSettings().catch(() => undefined)}
					size='sm'
					type='button'
					variant='danger'
				>
					重试
				</Button>
			</Alert>
		)
	}

	if (!sidebarSettings) {
		return null
	}

	return (
		<SettingsStack>
			<SettingsSection
				description='控制侧边栏主导航里哪些入口显示。至少保留一个主入口，避免侧边栏失去基本导航能力。'
				title='主导航'
			>
				<SettingsPreferenceGroup>
					{MAIN_ITEM_OPTIONS.map((item) => {
						const checked = sidebarSettings.mainItems[item.key].visible
						const disabled = pendingSections.mainItems || (checked && visibleMainItemCount === 1)
						return (
							<SettingsToggleRow
								description={item.description}
								isDisabled={disabled}
								isSelected={checked}
								key={item.key}
								label={item.label}
								onChange={(nextChecked) => handleMainItemVisibilityChange(item.key, nextChecked)}
							/>
						)
					})}
				</SettingsPreferenceGroup>
				{sectionErrors.mainItems ? (
					<Alert className='mt-4' role='alert' status='danger'>
						<Alert.Indicator />
						<Alert.Content>
							<Alert.Title>主导航更新失败</Alert.Title>
							<Alert.Description>{sectionErrors.mainItems}</Alert.Description>
						</Alert.Content>
					</Alert>
				) : null}
			</SettingsSection>

			<SettingsSection
				description='控制底部辅助入口是否显示，方便决定归档和回收站要不要常驻侧边栏。'
				title='辅助入口'
			>
				<SettingsPreferenceGroup>
					<SettingsToggleRow
						description='显示归档入口，方便集中查看暂时收起的内容。'
						isDisabled={
							pendingSections.footerItems ||
							(sidebarSettings.footerItems.archive.visible && visibleFooterItemCount === 1)
						}
						isSelected={sidebarSettings.footerItems.archive.visible}
						label='归档'
						onChange={(nextChecked) => handleFooterItemVisibilityChange('archive', nextChecked)}
					/>
					<SettingsToggleRow
						description='显示回收站入口，方便恢复或彻底删除内容。'
						isDisabled={
							pendingSections.footerItems ||
							(sidebarSettings.footerItems.trash.visible && visibleFooterItemCount === 1)
						}
						isSelected={sidebarSettings.footerItems.trash.visible}
						label='回收站'
						onChange={(nextChecked) => handleFooterItemVisibilityChange('trash', nextChecked)}
					/>
				</SettingsPreferenceGroup>
				{sectionErrors.footerItems ? (
					<Alert className='mt-4' role='alert' status='danger'>
						<Alert.Indicator />
						<Alert.Content>
							<Alert.Title>辅助入口更新失败</Alert.Title>
							<Alert.Description>{sectionErrors.footerItems}</Alert.Description>
						</Alert.Content>
					</Alert>
				) : null}
			</SettingsSection>

			<SettingsSection
				description='控制项目分区在侧边栏里的呈现方式，只保留真正会影响日常导航的几项。'
				title='项目分区'
			>
				<SettingsPreferenceGroup>
					<SettingsToggleRow
						description='决定侧边栏中是否展示项目分区。'
						isDisabled={pendingSections.projectSection}
						isSelected={sidebarSettings.projectSection.visible}
						label='显示项目分区'
						onChange={(nextChecked) => handleProjectSectionChange('visible', nextChecked)}
					/>
					<SettingsToggleRow
						description='控制项目分区里是否包含已完成项目。'
						isDisabled={pendingSections.projectSection}
						isSelected={sidebarSettings.projectSection.showCompleted}
						label='显示已完成项目'
						onChange={(nextChecked) => handleProjectSectionChange('showCompleted', nextChecked)}
					/>
					<SettingsToggleRow
						description='控制项目列表是否显示任务数量徽标。'
						isDisabled={pendingSections.projectSection}
						isSelected={sidebarSettings.projectSection.showCounts}
						label='显示数量'
						onChange={(nextChecked) => handleProjectSectionChange('showCounts', nextChecked)}
					/>
				</SettingsPreferenceGroup>
				{sectionErrors.projectSection ? (
					<Alert className='mt-4' role='alert' status='danger'>
						<Alert.Indicator />
						<Alert.Content>
							<Alert.Title>项目分区更新失败</Alert.Title>
							<Alert.Description>{sectionErrors.projectSection}</Alert.Description>
						</Alert.Content>
					</Alert>
				) : null}
			</SettingsSection>
		</SettingsStack>
	)
}
