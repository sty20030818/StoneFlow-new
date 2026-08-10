import { fireEvent, screen, waitFor } from '@testing-library/react'
import { render } from '@testing-library/react'

import { UserAppMenu } from '@/layout/header/UserAppMenu'
import {
	COMMAND_IDS,
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
} from '@/features/command'
import { TooltipProvider } from '@/shared/components/base/tooltip'

const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

describe('UserAppMenu', () => {
	it('点击头像打开应用菜单，并暴露设置与快捷键项', async () => {
		const onRunCommand = vi.fn()
		const onOpenChangelog = vi.fn()
		const onOpenAbout = vi.fn()
		renderUserAppMenu(
			<>
				<UserAppMenu
					onOpenAbout={onOpenAbout}
					onOpenChangelog={onOpenChangelog}
					onRunCommand={onRunCommand}
				/>
			</>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '应用菜单' }))

		expect(await screen.findByRole('menuitem', { name: /设置/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /键盘快捷键/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /更新日志/ })).toBeInTheDocument()
		expect(screen.queryByRole('menuitem', { name: /用户资料/ })).not.toBeInTheDocument()
		expect(screen.queryByRole('menuitem', { name: /诊断与支持/ })).not.toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /检查更新/ })).not.toHaveAttribute(
			'aria-disabled',
			'true',
		)
		expect(screen.getByRole('menuitem', { name: /关于 StoneFlow/ })).not.toHaveAttribute(
			'aria-disabled',
			'true',
		)
	})

	it('选择设置与键盘快捷键时调用对应 command', async () => {
		const onRunCommand = vi.fn()
		const onOpenChangelog = vi.fn()
		const onOpenAbout = vi.fn()
		renderUserAppMenu(
			<>
				<UserAppMenu
					onOpenAbout={onOpenAbout}
					onOpenChangelog={onOpenChangelog}
					onRunCommand={onRunCommand}
				/>
			</>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '应用菜单' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /设置/ }))
		expect(onRunCommand).toHaveBeenCalledWith(COMMAND_IDS.openSettings)

		fireEvent.pointerDown(screen.getByRole('button', { name: '应用菜单' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /键盘快捷键/ }))
		expect(onRunCommand).toHaveBeenCalledWith(COMMAND_IDS.openShortcutHelp)

		fireEvent.pointerDown(screen.getByRole('button', { name: '应用菜单' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /更新日志/ }))
		expect(onOpenChangelog).toHaveBeenCalledTimes(1)

		fireEvent.pointerDown(screen.getByRole('button', { name: '应用菜单' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /关于 StoneFlow/ }))
		expect(onOpenAbout).toHaveBeenCalledTimes(1)
	})

	it('打开应用菜单时关闭 trigger Tooltip', async () => {
		renderUserAppMenu(
			<UserAppMenu onOpenAbout={vi.fn()} onOpenChangelog={vi.fn()} onRunCommand={vi.fn()} />,
		)

		const trigger = screen.getByRole('button', { name: '应用菜单' })
		fireEvent.focus(trigger)
		expect(await screen.findByRole('tooltip')).toHaveTextContent('应用菜单')

		fireEvent.pointerDown(trigger)
		expect(await screen.findByRole('menu')).toBeInTheDocument()
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())
	})
})

function renderUserAppMenu(ui: React.ReactNode) {
	return render(
		<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>
			<TooltipProvider>{ui}</TooltipProvider>
		</ShortcutRegistryProvider>,
	)
}
