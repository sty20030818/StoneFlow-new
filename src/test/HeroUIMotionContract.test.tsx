// @ts-expect-error 此锁版测试只在 Vitest Node 环境读取供应商 CSS。
import { readFileSync } from 'node:fs'
// @ts-expect-error 此锁版测试只在 Vitest Node 环境解析项目路径。
import { resolve } from 'node:path'
import { act, render, screen, waitFor } from '@testing-library/react'
import { Button, Modal, Popover, ProgressBar, Toast, ToastQueue, Tooltip } from '@heroui/react'
import heroPackage from '@heroui/react/package.json' with { type: 'json' }
import { Sheet, Sidebar } from '@heroui-pro/react'
import heroProPackage from '@heroui-pro/react/package.json' with { type: 'json' }
import { describe, expect, it } from 'vitest'

const projectFile = (path: string) => readFileSync(resolve(path), 'utf8')

describe('HeroUI 动效合同', () => {
	it('关闭官方 Overlay 后正常卸载', async () => {
		const { rerender } = render(
			<>
				<Modal.Backdrop isOpen>
					<Modal.Container>
						<Modal.Dialog aria-label='Modal probe'>Modal probe</Modal.Dialog>
					</Modal.Container>
				</Modal.Backdrop>
				<Popover isOpen>
					<Button>Popover trigger</Button>
					<Popover.Content>
						<Popover.Dialog>Popover probe</Popover.Dialog>
					</Popover.Content>
				</Popover>
				<Tooltip isOpen>
					<Button>Tooltip trigger</Button>
					<Tooltip.Content>Tooltip probe</Tooltip.Content>
				</Tooltip>
				<Sheet isOpen>
					<Sheet.Backdrop>
						<Sheet.Content>
							<Sheet.Dialog aria-label='Sheet probe'>Sheet probe</Sheet.Dialog>
						</Sheet.Content>
					</Sheet.Backdrop>
				</Sheet>
			</>,
		)

		expect(screen.getByText('Modal probe')).toBeInTheDocument()
		expect(screen.getByText('Popover probe')).toBeInTheDocument()
		expect(screen.getByText('Tooltip probe')).toBeInTheDocument()
		expect(screen.getByText('Sheet probe')).toBeInTheDocument()

		rerender(
			<>
				<Modal.Backdrop isOpen={false}>
					<Modal.Container>
						<Modal.Dialog aria-label='Modal probe'>Modal probe</Modal.Dialog>
					</Modal.Container>
				</Modal.Backdrop>
				<Popover isOpen={false}>
					<Button>Popover trigger</Button>
					<Popover.Content>
						<Popover.Dialog>Popover probe</Popover.Dialog>
					</Popover.Content>
				</Popover>
				<Tooltip isOpen={false}>
					<Button>Tooltip trigger</Button>
					<Tooltip.Content>Tooltip probe</Tooltip.Content>
				</Tooltip>
				<Sheet isOpen={false}>
					<Sheet.Backdrop>
						<Sheet.Content>
							<Sheet.Dialog aria-label='Sheet probe'>Sheet probe</Sheet.Dialog>
						</Sheet.Content>
					</Sheet.Backdrop>
				</Sheet>
			</>,
		)

		await waitFor(() => {
			expect(screen.queryByText('Modal probe')).not.toBeInTheDocument()
			expect(screen.queryByText('Popover probe')).not.toBeInTheDocument()
			expect(screen.queryByText('Tooltip probe')).not.toBeInTheDocument()
			expect(screen.queryByText('Sheet probe')).not.toBeInTheDocument()
		})
	})

	it('Toast、Progress 与 Sidebar 可挂载并正常清理', async () => {
		const queue = new ToastQueue()
		const view = render(
			<>
				<Toast.Provider queue={queue} />
				<ProgressBar aria-label='Progress probe' value={50}>
					<ProgressBar.Track>
						<ProgressBar.Fill />
					</ProgressBar.Track>
				</ProgressBar>
				<Sidebar.Provider toggleShortcut={false}>
					<Sidebar>
						<Sidebar.Content>Sidebar probe</Sidebar.Content>
					</Sidebar>
				</Sidebar.Provider>
			</>,
		)

		act(() => {
			queue.add({ title: 'Toast probe' })
		})
		expect(await screen.findByText('Toast probe')).toBeInTheDocument()
		expect(screen.getByRole('progressbar', { name: 'Progress probe' })).toBeInTheDocument()
		expect(screen.getByText('Sidebar probe')).toBeInTheDocument()

		act(() => queue.clear())
		await waitFor(() => expect(screen.queryByText('Toast probe')).not.toBeInTheDocument())
		view.unmount()
		expect(screen.queryByRole('progressbar', { name: 'Progress probe' })).not.toBeInTheDocument()
		expect(screen.queryByText('Sidebar probe')).not.toBeInTheDocument()
	})

	it('锁定包保留官方动效与 reduced-motion CSS', () => {
		const vendorCss = [
			'node_modules/@heroui/styles/dist/components/modal.css',
			'node_modules/@heroui/styles/dist/components/popover.css',
			'node_modules/@heroui/styles/dist/components/tooltip.css',
			'node_modules/@heroui/styles/dist/components/toast.css',
			'node_modules/@heroui/styles/dist/components/progress-bar.css',
			'node_modules/@heroui-pro/react/dist/css/components/sheet.css',
			'node_modules/@heroui-pro/react/dist/css/components/sidebar.css',
		].map(projectFile)

		expect(heroPackage.version).toBe('3.2.4')
		expect(heroProPackage.version).toBe('1.0.0-beta.8')
		for (const css of vendorCss) {
			expect(css).toMatch(/animation|transition/)
			expect(css).toMatch(/motion-reduce|prefers-reduced-motion/)
		}
	})
})
