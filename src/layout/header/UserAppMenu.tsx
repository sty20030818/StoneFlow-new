import { useState } from 'react'

import {
	COMMAND_IDS,
	resolveCommandShortcut,
	type CommandId,
	useShortcutRegistry,
} from '@/features/command'
import { useManualUpdateCheck } from '@/features/update'
import { ShortcutTokens } from '@/shared/components/ShortcutTokens'
import { cn } from '@/shared/lib/utils'
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/shared/components/base/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'
import {
	shellChromeNavCircleButtonClass,
	shellChromeNavCircleButtonExpandedClass,
} from '@/shared/components/patterns/shell-chrome'
import { ActionTooltip } from '@/shared/components/tooltip'
import { InfoIcon, HistoryIcon, KeyboardIcon, RefreshCwIcon, SettingsIcon } from 'lucide-react'

/** 与 CommandMenu / ShortcutHelp 一致的 kbd 样式 */
const menuShortcutKbdClassName =
	'h-6 min-w-6 rounded-sm border border-sf-border-subtle bg-background/90 px-1.5 text-[11px] text-sf-text-secondary'

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

	return (
		<DropdownMenuShortcut className='tracking-normal'>
			<ShortcutTokens
				kbdClassName={menuShortcutKbdClassName}
				separatorClassName='text-sf-text-quaternary'
				tokens={tokens}
			/>
		</DropdownMenuShortcut>
	)
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
	const [menuOpen, setMenuOpen] = useState(false)
	const [tooltipOpen, setTooltipOpen] = useState(false)

	function handleMenuOpenChange(nextOpen: boolean) {
		setMenuOpen(nextOpen)
		if (nextOpen) {
			setTooltipOpen(false)
		}
	}

	return (
		<DropdownMenu onOpenChange={handleMenuOpenChange} open={menuOpen}>
			<ActionTooltip
				onOpenChange={(nextOpen) => setTooltipOpen(menuOpen ? false : nextOpen)}
				open={tooltipOpen}
			>
				<ActionTooltip.Trigger asChild>
					<DropdownMenuTrigger asChild>
						<button
							aria-label='应用菜单'
							className={cn(
								shellChromeNavCircleButtonClass,
								shellChromeNavCircleButtonExpandedClass,
								'relative size-7.5 shrink-0 rounded-full p-0',
								'focus-visible:ring-0 data-[state=open]:bg-sf-shell-hover-strong',
							)}
							type='button'
						>
							<Avatar className='size-7.5'>
								<AvatarImage alt='' src='/avatar.jpg' />
								<AvatarFallback>U</AvatarFallback>
								<AvatarBadge className='bg-green-600 dark:bg-green-800' />
							</Avatar>
						</button>
					</DropdownMenuTrigger>
				</ActionTooltip.Trigger>
				<ActionTooltip.Content>
					<ActionTooltip.Row label='应用菜单' />
				</ActionTooltip.Content>
			</ActionTooltip>

			<DropdownMenuContent align='end' className='min-w-56' sideOffset={6}>
				{/* 偏好 */}
				<DropdownMenuGroup>
					<DropdownMenuItem
						data-active={isSettingsActive || undefined}
						onSelect={() => onRunCommand(COMMAND_IDS.openSettings)}
					>
						<SettingsIcon />
						<span>设置</span>
						<MenuCommandShortcut commandId={COMMAND_IDS.openSettings} />
					</DropdownMenuItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				{/* 帮助 */}
				<DropdownMenuGroup>
					<DropdownMenuItem onSelect={() => onRunCommand(COMMAND_IDS.openShortcutHelp)}>
						<KeyboardIcon />
						<span>键盘快捷键</span>
						<MenuCommandShortcut commandId={COMMAND_IDS.openShortcutHelp} />
					</DropdownMenuItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				{/* 应用 */}
				<DropdownMenuGroup>
					<DropdownMenuItem disabled={disabled} onSelect={() => void checkNow()}>
						<RefreshCwIcon />
						<span>
							{isChecking ? '正在检查更新...' : disabled ? '正在安装更新...' : '检查更新'}
						</span>
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={onOpenChangelog}>
						<HistoryIcon />
						<span>更新日志</span>
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={onOpenAbout}>
						<InfoIcon />
						<span>关于 StoneFlow</span>
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
