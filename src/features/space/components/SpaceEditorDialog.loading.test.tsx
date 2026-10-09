import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'

const loading = vi.hoisted(() => ({ ready: Promise.withResolvers<void>(), imported: vi.fn() }))

vi.mock('./SpaceEditorForm', async (importOriginal) => {
	loading.imported()
	await loading.ready.promise
	return importOriginal<typeof import('./SpaceEditorForm')>()
})

let SpaceEditorDialog: typeof import('..').SpaceEditorDialog
let TestInteractionProviders: typeof import('@/test/TestInteractionProviders').TestInteractionProviders

beforeEach(async () => {
	vi.resetModules()
	loading.ready = Promise.withResolvers<void>()
	;({ SpaceEditorDialog } = await import('..'))
	;({ TestInteractionProviders } = await import('@/test/TestInteractionProviders'))
})

function Scene({ onClose }: { onClose: () => void }) {
	const [open, setOpen] = useState(false)
	return (
		<TestInteractionProviders>
			<button onClick={() => setOpen(true)} type='button'>
				打开 Space 编辑器
			</button>
			<SpaceEditorDialog
				mode='create'
				onClose={() => {
					onClose()
					setOpen(false)
				}}
				onSubmit={async () => undefined}
				open={open}
			/>
		</TestInteractionProviders>
	)
}

it('同步外壳先拥有焦点与关闭，真实表单异步到达后聚焦名称且不重建 Dialog', async () => {
	const onClose = vi.fn()
	render(<Scene onClose={onClose} />)
	expect(loading.imported).not.toHaveBeenCalled()
	const trigger = screen.getByRole('button', { name: '打开 Space 编辑器' })
	act(() => trigger.focus())
	fireEvent.click(trigger)
	const dialog = screen.getByRole('dialog', { name: '新建 Space' })
	expect(screen.getByRole('status')).toHaveTextContent('正在加载编辑内容')
	expect(screen.queryByRole('textbox', { name: '名称' })).not.toBeInTheDocument()
	await waitFor(() => expect(dialog).toHaveFocus())

	await act(async () => loading.ready.resolve())
	const input = await screen.findByRole('textbox', { name: '名称' })
	await waitFor(() => expect(input).toHaveFocus())
	expect(screen.getByRole('dialog', { name: '新建 Space' })).toBe(dialog)
	fireEvent.keyDown(input, { key: 'Escape' })
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
	await waitFor(() => expect(trigger).toHaveFocus())
	expect(onClose).toHaveBeenCalledOnce()
})

it('加载前 Escape 由真实 Modal 关闭并回焦，迟到表单不重新打开窗口或穿透底层', async () => {
	const onClose = vi.fn()
	const backgroundKeydown = vi.fn()
	render(<Scene onClose={onClose} />)
	const trigger = screen.getByRole('button', { name: '打开 Space 编辑器' })
	act(() => trigger.focus())
	fireEvent.click(trigger)
	const dialog = screen.getByRole('dialog', { name: '新建 Space' })
	await waitFor(() => expect(dialog).toHaveFocus())
	window.addEventListener('keydown', backgroundKeydown)
	try {
		fireEvent.keyDown(dialog, { key: 'Escape' })
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
		await waitFor(() => expect(trigger).toHaveFocus())
		expect(backgroundKeydown).not.toHaveBeenCalled()
		await act(async () => loading.ready.resolve())
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		expect(trigger).toHaveFocus()
		expect(onClose).toHaveBeenCalledOnce()
	} finally {
		window.removeEventListener('keydown', backgroundKeydown)
	}
})
