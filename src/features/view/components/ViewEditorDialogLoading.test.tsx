import { useLayoutEffect, useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Modal } from '@heroui/react'

import { SubmitRegistryProvider } from '@/features/submit'
import { ViewEditorDialog, type ViewSaveFlow } from '@/features/view'
import { TestInteractionProviders } from '@/test/TestInteractionProviders'

const loading = vi.hoisted(() => {
	let resolve!: () => void
	const ready = new Promise<void>((done) => {
		resolve = done
	})
	return {
		imported: vi.fn(),
		ready,
		resolve,
		submit: vi.fn(async () => undefined),
		disposed: vi.fn(),
	}
})

vi.mock('./ViewEditorDialogContent', async () => {
	loading.imported()
	await loading.ready
	return {
		ViewEditorDialogContent: ({
			onSubmitReady,
		}: {
			onSubmitReady: (submit: () => Promise<void>) => () => void
		}) => {
			useLayoutEffect(() => {
				const cleanup = onSubmitReady(loading.submit)
				return () => {
					cleanup()
					loading.disposed()
				}
			}, [onSubmitReady])
			return <input aria-label='延迟名称' autoFocus />
		},
	}
})

function Harness() {
	const [session, setSession] = useState({ open: false, sessionKey: 0 })
	const [about, setAbout] = useState(false)
	const flow: ViewSaveFlow = {
		...session,
		pending: null,
		error: null,
		savedView: null,
		begin: () => setSession((state) => ({ open: true, sessionKey: state.sessionKey + 1 })),
		close: () => setSession((state) => ({ open: false, sessionKey: state.sessionKey + 1 })),
		submit: vi.fn(),
		retryOpen: vi.fn(),
	}
	return (
		<TestInteractionProviders>
			<SubmitRegistryProvider>
				<button onClick={flow.begin}>打开视图</button>
				<button onClick={() => setAbout(true)}>打开 About</button>
				<ViewEditorDialog
					flow={flow}
					view={null}
					projects={[]}
					onCreate={vi.fn()}
					onUpdate={vi.fn()}
				/>
				<Modal.Backdrop isOpen={about} onOpenChange={setAbout}>
					<Modal.Container>
						<Modal.Dialog aria-label='About'>About</Modal.Dialog>
					</Modal.Container>
				</Modal.Backdrop>
			</SubmitRegistryProvider>
		</TestInteractionProviders>
	)
}

it('View 的真实 Modal 同步接管 pending 关层；迟到表单不抢焦，重开复用已加载模块', async () => {
	render(<Harness />)
	const trigger = screen.getByRole('button', { name: '打开视图' })
	trigger.focus()
	expect(loading.imported).not.toHaveBeenCalled()
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	fireEvent.click(trigger)
	const dialog = screen.getByRole('dialog', { name: '新建保存视图' })
	expect(screen.getByRole('status')).toHaveTextContent('正在打开')
	await waitFor(() => expect(loading.imported).toHaveBeenCalledOnce())
	fireEvent.submit(dialog.querySelector('form')!)
	expect(loading.submit).not.toHaveBeenCalled()
	expect(screen.queryByRole('textbox', { name: '延迟名称' })).not.toBeInTheDocument()
	const backgroundEscape = vi.fn()
	window.addEventListener('keydown', backgroundEscape)
	try {
		fireEvent.click(screen.getByRole('button', { name: '打开 About', hidden: true }))
		fireEvent.keyDown(screen.getByRole('dialog', { name: 'About' }), { key: 'Escape' })
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: 'About' })).not.toBeInTheDocument(),
		)
		expect(dialog).toBeInTheDocument()
		expect(backgroundEscape).not.toHaveBeenCalled()
		fireEvent.keyDown(dialog, { key: 'Escape' })
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		await waitFor(() => expect(trigger).toHaveFocus())
		expect(backgroundEscape).not.toHaveBeenCalled()
		await act(async () => {
			loading.resolve()
			await loading.ready
		})
		expect(screen.queryByRole('textbox', { name: '延迟名称' })).not.toBeInTheDocument()
		expect(trigger).toHaveFocus()
		fireEvent.click(trigger)
		expect(await screen.findByRole('textbox', { name: '延迟名称' })).toHaveFocus()
		expect(loading.imported).toHaveBeenCalledOnce()
		fireEvent.submit(screen.getByRole('textbox', { name: '延迟名称' }).closest('form')!)
		expect(loading.submit).toHaveBeenCalledOnce()
		fireEvent.click(screen.getByRole('button', { name: '关闭保存视图编辑窗口' }))
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		expect(loading.disposed).toHaveBeenCalledOnce()
		fireEvent.click(trigger)
		const reopened = await screen.findByRole('textbox', { name: '延迟名称' })
		fireEvent.submit(reopened.closest('form')!)
		expect(loading.submit).toHaveBeenCalledTimes(2)
		fireEvent.click(screen.getByRole('button', { name: '关闭保存视图编辑窗口' }))
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		expect(loading.disposed).toHaveBeenCalledTimes(2)
		fireEvent.keyDown(trigger, { key: 'Escape' })
		expect(backgroundEscape).toHaveBeenCalledOnce()
	} finally {
		window.removeEventListener('keydown', backgroundEscape)
	}
})
