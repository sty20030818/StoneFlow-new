import { fireEvent, screen } from '@testing-library/react'
import { render } from '@testing-library/react'

import { UserAppMenu } from '@/layout/header/UserAppMenu'
import {
	COMMAND_IDS,
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	ShortcutRegistryProvider,
} from '@/features/command'

const TEST_SHORTCUT_REGISTRY = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

describe('UserAppMenu', () => {
	it('应用菜单暴露稳定入口，并把动作交给 command 或上层 callback', async () => {
		const onRunCommand = vi.fn()
		const onOpenChangelog = vi.fn()
		const onOpenAbout = vi.fn()
		renderUserAppMenu(
			<UserAppMenu
				onOpenAbout={onOpenAbout}
				onOpenChangelog={onOpenChangelog}
				onRunCommand={onRunCommand}
			/>,
		)

		const trigger = screen.getByRole('button', { name: '应用菜单' })
		expect(trigger).toHaveClass('button--sm')
		expect(trigger.querySelector('.avatar')).toHaveClass('avatar--sm')

		fireEvent.click(trigger)

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
		fireEvent.click(await screen.findByRole('menuitem', { name: /设置/ }))
		expect(onRunCommand).toHaveBeenCalledWith(COMMAND_IDS.openSettings)

		fireEvent.click(screen.getByRole('button', { name: '应用菜单' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /键盘快捷键/ }))
		expect(onRunCommand).toHaveBeenCalledWith(COMMAND_IDS.openShortcutHelp)

		fireEvent.click(screen.getByRole('button', { name: '应用菜单' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /更新日志/ }))
		expect(onOpenChangelog).toHaveBeenCalledTimes(1)

		fireEvent.click(screen.getByRole('button', { name: '应用菜单' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /关于 StoneFlow/ }))
		expect(onOpenAbout).toHaveBeenCalledTimes(1)
	})
})

function renderUserAppMenu(ui: React.ReactNode) {
	return render(
		<ShortcutRegistryProvider registry={TEST_SHORTCUT_REGISTRY}>{ui}</ShortcutRegistryProvider>,
	)
}
