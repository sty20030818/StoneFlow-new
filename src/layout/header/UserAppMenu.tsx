import { getCommandShortcutTokens } from '@/features/command'
import { ShortcutTokens } from '@/features/command'
import { COMMAND_IDS, type CommandId } from '@/features/command'
import { useManualUpdateCheck } from '@/features/update'
import { cn } from '@/shared/lib/utils'
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/shared/components/base/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'
import {
	shellChromeNavCircleButtonClass,
	shellChromeNavCircleButtonExpandedClass,
} from '@/shared/components/patterns/shell-chrome'
import {
	InfoIcon,
	HistoryIcon,
	KeyboardIcon,
	RefreshCwIcon,
	SettingsIcon,
	StethoscopeIcon,
	UserIcon,
} from 'lucide-react'

const PLACEHOLDER_HINT = '即将推出'

/** 与 CommandMenu / ShortcutHelp 一致的 kbd 样式 */
const menuShortcutKbdClassName =
	'h-6 min-w-6 rounded-sm border border-sf-border-subtle bg-background/90 px-1.5 text-[11px] text-sf-text-secondary'

function MenuCommandShortcut({ commandId }: { commandId: CommandId }) {
	const tokens = getCommandShortcutTokens(commandId)
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
 * Header 头像应用菜单：偏好 / 帮助 / 应用 / 诊断。
 * V1 仅接线「设置」「键盘快捷键」；其余为占位。
 */
export function UserAppMenu({
	isSettingsActive = false,
	onRunCommand,
	onOpenChangelog,
	onOpenAbout,
}: UserAppMenuProps) {
	const { checkNow, isChecking } = useManualUpdateCheck()
	return (
		<DropdownMenu>
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
					<DropdownMenuItem disabled title={PLACEHOLDER_HINT}>
						<UserIcon />
						<span>用户资料</span>
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
					<DropdownMenuItem onSelect={onOpenChangelog}>
						<HistoryIcon />
						<span>更新记录</span>
					</DropdownMenuItem>
					<DropdownMenuItem disabled={isChecking} onSelect={() => void checkNow()}>
						<RefreshCwIcon />
						<span>{isChecking ? '正在检查更新...' : '检查更新'}</span>
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={onOpenAbout}>
						<InfoIcon />
						<span>关于 StoneFlow</span>
					</DropdownMenuItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				{/* 诊断：可展开查看占位子项 */}
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<StethoscopeIcon />
						<span>诊断与支持</span>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent className='min-w-48'>
						<DropdownMenuItem disabled title={PLACEHOLDER_HINT}>
							<span>复制诊断信息</span>
						</DropdownMenuItem>
						<DropdownMenuItem disabled title={PLACEHOLDER_HINT}>
							<span>打开日志</span>
						</DropdownMenuItem>
						<DropdownMenuItem disabled title={PLACEHOLDER_HINT}>
							<span>同步诊断</span>
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
