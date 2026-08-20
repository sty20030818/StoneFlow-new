import { Avatar, Badge, Button, Dropdown } from '@heroui/react'

import {
	COMMAND_IDS,
	resolveCommandShortcut,
	type CommandId,
	useShortcutRegistry,
} from '@/features/command'
import { useManualUpdateCheck } from '@/features/update'
import { ShortcutTokens } from '@/shared/components/ShortcutTokens'
import { ActionTooltip } from '@/shared/components/tooltip'
import { InfoIcon, HistoryIcon, KeyboardIcon, RefreshCwIcon, SettingsIcon } from 'lucide-react'

function MenuCommandShortcut({ commandId }: { commandId: CommandId }) {
	const registry = useShortcutRegistry()
	const tokens = resolveCommandShortcut({
		registry,
		commandId,
		scope: 'global',
		mode: 'primary',
	})
	if (!tokens) {
		return null
	}

	return <ShortcutTokens className='ml-auto' tokens={tokens} />
}

export type UserAppMenuProps = {
	/** 当前是否处于设置页（可选高亮「设置」项） */
	isSettingsActive?: boolean
	onRunCommand: (id: CommandId) => void
	onOpenChangelog: () => void
	onOpenAbout: () => void
}

/**
 * Header 头像应用菜单：偏好 / 帮助 / 应用。
 * 只展示已经接入的真实操作；未实现能力不以 disabled 占位项暴露。
 */
export function UserAppMenu({
	isSettingsActive = false,
	onRunCommand,
	onOpenChangelog,
	onOpenAbout,
}: UserAppMenuProps) {
	const { checkNow, disabled, isChecking } = useManualUpdateCheck()

	return (
		<Dropdown>
			<ActionTooltip delay={0} label='应用菜单'>
				<Button
					aria-label='应用菜单'
					className='relative shrink-0'
					isIconOnly
					size='lg'
					type='button'
					variant='ghost'
				>
					<Badge color='success' placement='bottom-right' size='sm'>
						<Badge.Anchor>
							<Avatar size='sm'>
								<Avatar.Image alt='' src='/avatar.jpg' />
								<Avatar.Fallback>U</Avatar.Fallback>
							</Avatar>
						</Badge.Anchor>
						<Badge.Label aria-label='在线' />
					</Badge>
				</Button>
			</ActionTooltip>

			<Dropdown.Popover className='min-w-56' offset={6} placement='bottom end'>
				<Dropdown.Menu aria-label='应用菜单'>
					<Dropdown.Item
						aria-current={isSettingsActive ? 'page' : undefined}
						id='settings'
						onAction={() => onRunCommand(COMMAND_IDS.openSettings)}
						textValue='设置'
					>
						<SettingsIcon />
						<span>设置</span>
						<MenuCommandShortcut commandId={COMMAND_IDS.openSettings} />
					</Dropdown.Item>
					<Dropdown.Item
						id='shortcuts'
						onAction={() => onRunCommand(COMMAND_IDS.openShortcutHelp)}
						textValue='键盘快捷键'
					>
						<KeyboardIcon />
						<span>键盘快捷键</span>
						<MenuCommandShortcut commandId={COMMAND_IDS.openShortcutHelp} />
					</Dropdown.Item>
					<Dropdown.Item
						id='check-update'
						isDisabled={disabled}
						onAction={() => void checkNow()}
						textValue='检查更新'
					>
						<RefreshCwIcon />
						<span>
							{isChecking ? '正在检查更新...' : disabled ? '正在安装更新...' : '检查更新'}
						</span>
					</Dropdown.Item>
					<Dropdown.Item id='changelog' onAction={onOpenChangelog} textValue='更新日志'>
						<HistoryIcon />
						<span>更新日志</span>
					</Dropdown.Item>
					<Dropdown.Item id='about' onAction={onOpenAbout} textValue='关于 StoneFlow'>
						<InfoIcon />
						<span>关于 StoneFlow</span>
					</Dropdown.Item>
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}
