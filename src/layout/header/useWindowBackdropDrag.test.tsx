import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Button, Modal, Popover } from '@heroui/react'
import { useRef, useState } from 'react'

import { useWindowBackdropDrag } from './useWindowBackdropDrag'

const { isTauri, startDragging } = vi.hoisted(() => ({
	isTauri: vi.fn(() => true),
	startDragging: vi.fn<() => Promise<void>>(),
}))

vi.mock('@tauri-apps/api/core', () => ({ isTauri }))
vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: () => ({ startDragging }),
}))

beforeEach(() => {
	isTauri.mockReturnValue(true)
	startDragging.mockReset().mockResolvedValue(undefined)
})

describe('useWindowBackdropDrag', () => {
	it.each(['modal-backdrop', 'alert-dialog-backdrop', 'command-backdrop', 'sheet-backdrop'])(
		'%s：顶栏拖动保留弹窗、输入与焦点，下方外点仍关闭',
		async (slot) => {
			renderProbe({ slot })
			const input = screen.getByRole('textbox', { name: '任务标题' })
			fireEvent.change(input, { target: { value: '保留正在输入的内容' } })
			act(() => input.focus())
			const backdrop = screen.getByTestId('backdrop')

			expect(clickAt(backdrop)).toEqual({ pointerDown: false, click: false })

			expect(startDragging).toHaveBeenCalledOnce()
			expect(screen.getByRole('dialog', { name: '新建任务' })).toBeInTheDocument()
			expect(input).toHaveValue('保留正在输入的内容')
			expect(input).toHaveFocus()
			const submit = screen.getByRole('button', { name: '创建任务' })
			act(() => submit.focus())
			fireEvent.keyDown(submit, { key: 'Tab' })
			expect(input).toHaveFocus()

			clickAt(backdrop, { clientY: 120 })
			await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
			expect(startDragging).toHaveBeenCalledOnce()
		},
	)

	it('嵌套 Popover 打开时拖动不关闭任一层，也不转移输入焦点', async () => {
		const { container } = renderProbe({ nested: true })
		clickAt(screen.getByRole('button', { name: '选择日期' }), { clientY: 120 })
		const popover = await screen.findByRole('dialog', { name: '日期选择' })
		const input = screen.getByRole('textbox', { name: '日期输入' })
		act(() => input.focus())

		// jsdom 不实现 inert 命中重定向；复现 WebView 中背景被隔离后事件落到 body 的路径。
		container.setAttribute('inert', '')
		clickAt(document.body)

		expect(startDragging).toHaveBeenCalledOnce()
		expect(screen.getByTestId('backdrop')).toBeInTheDocument()
		expect(popover).toBeInTheDocument()
		expect(input).toHaveFocus()
	})

	it.each(['dialog-header', 'title-input', 'sheet-content'])(
		'%s：即使坐标位于顶栏，弹窗自身区域也不拖动窗口',
		(target) => {
			renderProbe()

			clickAt(screen.getByTestId(target))

			expect(startDragging).not.toHaveBeenCalled()
			expect(screen.getByRole('dialog', { name: '新建任务' })).toBeInTheDocument()
		},
	)

	it.each([
		{ label: '右键', button: 2 },
		{ label: '左侧范围外', clientX: -1 },
		{ label: '右侧边界', clientX: 800 },
		{ label: '顶部范围外', clientY: -1 },
		{ label: '底部边界', clientY: 44 },
	])('$label 不触发窗口拖动', (coordinates) => {
		renderProbe()

		clickAt(screen.getByTestId('backdrop'), coordinates)

		expect(startDragging).not.toHaveBeenCalled()
	})

	it('每次交互读取当前顶栏尺寸，不沿用挂载时的位置', () => {
		const { headerRect } = renderProbe()
		headerRect.mockReturnValue(new DOMRect(100, 20, 600, 44))

		clickAt(screen.getByTestId('backdrop'), { clientY: 60 })

		expect(startDragging).toHaveBeenCalledOnce()
	})

	it('Header 未被 inert 隔离时，body 不充当窗口拖动区域', () => {
		renderProbe()
		expect(screen.getByTestId('window-header').closest('[inert]')).toBeNull()

		clickAt(document.body)

		expect(startDragging).not.toHaveBeenCalled()
	})

	it('非 Tauri 环境不消费顶栏外点，保持 Modal 原有关闭行为', async () => {
		isTauri.mockReturnValue(false)
		renderProbe()

		clickAt(screen.getByTestId('backdrop'))

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		expect(startDragging).not.toHaveBeenCalled()
	})

	it('卸载时移除两个 window 捕获监听', () => {
		const addListener = vi.spyOn(window, 'addEventListener')
		const removeListener = vi.spyOn(window, 'removeEventListener')
		const { unmount } = renderProbe()
		const registrations = addListener.mock.calls.filter(
			([type]) => type === 'pointerdown' || type === 'click',
		)
		expect(registrations.map(([type]) => type).sort()).toEqual(['click', 'pointerdown'])

		unmount()

		for (const [type, listener] of registrations) {
			expect(removeListener).toHaveBeenCalledWith(type, listener, true)
		}
	})

	it('原生拖动失败保留弹窗，并留下明确诊断', async () => {
		const error = new Error('原生窗口拖动被拒绝')
		startDragging.mockRejectedValueOnce(error)
		const report = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		renderProbe()

		clickAt(screen.getByTestId('backdrop'))

		await waitFor(() => expect(report).toHaveBeenCalledWith('窗口拖动失败', error))
		expect(screen.getByRole('dialog', { name: '新建任务' })).toBeInTheDocument()
	})
})

function clickAt(
	target: Element,
	coordinates: { button?: number; clientX?: number; clientY?: number } = {},
) {
	const event = { button: 0, clientX: 300, clientY: 22, pointerType: 'mouse', ...coordinates }
	const pointerDown = fireEvent.pointerDown(target, event)
	fireEvent.pointerUp(target, event)
	return { pointerDown, click: fireEvent.click(target, event) }
}

function renderProbe(props: { slot?: string; nested?: boolean } = {}) {
	const result = render(<WindowModalProbe {...props} />)
	const headerRect = vi
		.spyOn(screen.getByTestId('window-header'), 'getBoundingClientRect')
		.mockReturnValue(new DOMRect(0, 0, 800, 44))
	return { ...result, headerRect }
}

function WindowModalProbe({ slot = 'modal-backdrop', nested = false }) {
	const headerRef = useRef<HTMLElement>(null)
	const [open, setOpen] = useState(true)
	useWindowBackdropDrag(headerRef)

	return (
		<>
			<header ref={headerRef} data-testid='window-header'>
				<button type='button'>背景搜索</button>
			</header>
			<Modal.Backdrop isOpen={open} onOpenChange={setOpen} data-slot={slot} data-testid='backdrop'>
				<Modal.Container>
					<Modal.Dialog aria-label='新建任务'>
						<Modal.Header data-testid='dialog-header'>新建任务</Modal.Header>
						<input aria-label='任务标题' data-testid='title-input' />
						<div data-slot='sheet-content' data-testid='sheet-content'>
							顶部 Sheet 正文
						</div>
						{nested ? (
							<Popover>
								<Button>选择日期</Button>
								<Popover.Content>
									<Popover.Dialog aria-label='日期选择'>
										<input aria-label='日期输入' />
									</Popover.Dialog>
								</Popover.Content>
							</Popover>
						) : null}
						<Button>创建任务</Button>
					</Modal.Dialog>
				</Modal.Container>
			</Modal.Backdrop>
		</>
	)
}
