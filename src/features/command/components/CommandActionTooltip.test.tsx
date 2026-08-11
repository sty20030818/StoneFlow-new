/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react'

import { COMMAND_IDS } from '@/features/command/core'
import { KeybindingRegistry } from '@/features/command/keybinding'
import { ShortcutRegistryProvider } from '@/features/command/shortcuts'
import { Button } from '@/shared/components/base/button'
import { TooltipProvider } from '@/shared/components/base/tooltip'

import { CommandActionTooltip, DisabledCommandActionTooltip } from './CommandActionTooltip'

describe('CommandActionTooltip', () => {
	it('从注入的 Registry 展示主快捷键，并为顺序输入提供读屏文案', async () => {
		const registry = new KeybindingRegistry([
			{
				allowInEditable: false,
				commandId: COMMAND_IDS.goAllTasks,
				display: 'primary',
				preventDefault: false,
				scope: 'global',
				sequence: [{ key: 'g' }, { key: 't' }],
			},
		])

		const { container } = renderTooltip(
			registry,
			<CommandActionTooltip commandId={COMMAND_IDS.goAllTasks} defaultOpen label='全部任务'>
				<button type='button'>入口</button>
			</CommandActionTooltip>,
		)

		expect(await screen.findByRole('tooltip')).toHaveTextContent('全部任务')
		expect(screen.getByLabelText('依次按 G、T')).toBeInTheDocument()
		expect(container.ownerDocument.querySelector('.lucide-arrow-right')).toBeInTheDocument()
	})

	it('命令没有可展示快捷键时只显示操作名称', async () => {
		const registry = new KeybindingRegistry([])

		renderTooltip(
			registry,
			<CommandActionTooltip commandId='test.unbound' defaultOpen label='未绑定操作'>
				<button type='button'>入口</button>
			</CommandActionTooltip>,
		)

		expect(await screen.findByRole('tooltip')).toHaveTextContent('未绑定操作')
		expect(screen.queryByLabelText(/^按|^依次按/)).not.toBeInTheDocument()
	})

	it('禁用控件仍可聚焦，并展示同一命令的快捷键', async () => {
		const registry = new KeybindingRegistry([
			{
				allowInEditable: true,
				commandId: COMMAND_IDS.saveOrSubmit,
				display: 'primary',
				preventDefault: true,
				scope: 'global',
				sequence: [{ key: 'f' }],
			},
		])

		renderTooltip(
			registry,
			<DisabledCommandActionTooltip commandId={COMMAND_IDS.saveOrSubmit} label='创建任务'>
				<Button disabled type='button'>
					创建任务
				</Button>
			</DisabledCommandActionTooltip>,
		)

		const trigger = document.querySelector('[data-slot="disabled-command-action-tooltip-trigger"]')
		expect(trigger).toHaveAttribute('tabindex', '0')
		expect(trigger).toHaveAttribute('aria-disabled', 'true')
		fireEvent.pointerMove(trigger!, { pointerType: 'mouse' })
		expect(await screen.findByRole('tooltip')).toHaveTextContent('创建任务F')
		expect(screen.getByLabelText('按 F')).toBeInTheDocument()
	})
})

function renderTooltip(registry: KeybindingRegistry, ui: React.ReactNode) {
	return render(
		<ShortcutRegistryProvider registry={registry}>
			<TooltipProvider delayDuration={0}>{ui}</TooltipProvider>
		</ShortcutRegistryProvider>,
	)
}
