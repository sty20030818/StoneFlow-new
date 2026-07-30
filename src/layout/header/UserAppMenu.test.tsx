import { fireEvent, screen } from '@testing-library/react'
import { render } from '@testing-library/react'

import { UserAppMenu } from '@/layout/header/UserAppMenu'
import { COMMAND_IDS } from '@/features/command'
import { TooltipProvider } from '@/shared/components/base/tooltip'

describe('UserAppMenu', () => {
	it('点击头像打开应用菜单，并暴露设置与快捷键项', async () => {
		const onRunCommand = vi.fn()
		const onOpenChangelog = vi.fn()
		const onOpenAbout = vi.fn()
		render(
			<TooltipProvider>
				<UserAppMenu
					onOpenAbout={onOpenAbout}
					onOpenChangelog={onOpenChangelog}
					onRunCommand={onRunCommand}
				/>
			</TooltipProvider>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '应用菜单' }))

		expect(await screen.findByRole('menuitem', { name: /设置/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /键盘快捷键/ })).toBeInTheDocument()
		expect(screen.getByRole('menuitem', { name: /更新记录/ })).toBeInTheDocument()
		// Radix 菜单项用 aria-disabled / data-disabled，不是 native disabled
		expect(screen.getByRole('menuitem', { name: /用户资料/ })).toHaveAttribute(
			'aria-disabled',
			'true',
		)
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
		render(
			<TooltipProvider>
				<UserAppMenu
					onOpenAbout={onOpenAbout}
					onOpenChangelog={onOpenChangelog}
					onRunCommand={onRunCommand}
				/>
			</TooltipProvider>,
		)

		fireEvent.pointerDown(screen.getByRole('button', { name: '应用菜单' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /设置/ }))
		expect(onRunCommand).toHaveBeenCalledWith(COMMAND_IDS.openSettings)

		fireEvent.pointerDown(screen.getByRole('button', { name: '应用菜单' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /键盘快捷键/ }))
		expect(onRunCommand).toHaveBeenCalledWith(COMMAND_IDS.openShortcutHelp)

		fireEvent.pointerDown(screen.getByRole('button', { name: '应用菜单' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /更新记录/ }))
		expect(onOpenChangelog).toHaveBeenCalledTimes(1)

		fireEvent.pointerDown(screen.getByRole('button', { name: '应用菜单' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: /关于 StoneFlow/ }))
		expect(onOpenAbout).toHaveBeenCalledTimes(1)
	})
})
