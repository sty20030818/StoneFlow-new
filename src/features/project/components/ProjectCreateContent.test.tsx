import { useState } from 'react'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'

import { SubmitRegistryProvider, useSubmitRegistryActions } from '@/features/submit'
import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'
import { ProjectCreateContent } from './ProjectCreateContent'

const createProjectMock = vi.fn()

vi.mock('@/features/project/hooks/project.mutations', () => ({
	useCreateProjectMutation: () => ({
		mutateAsync: createProjectMock,
	}),
}))

describe('ProjectCreateContent', () => {
	beforeEach(() => {
		createProjectMock.mockReset()
		createProjectMock.mockResolvedValue({ id: 'project-created' })
	})

	it('名称为空时禁用创建，但仍展示创建快捷键', async () => {
		renderProjectCreate()

		const button = screen.getByRole('button', { name: '创建项目' })
		expect(button).toBeDisabled()
		const trigger = button.closest<HTMLElement>(
			'[data-slot="disabled-command-action-tooltip-trigger"]',
		)
		expect(trigger).not.toBeNull()
		fireEvent.keyDown(document, { key: 'Tab' })
		act(() => trigger!.focus())

		const tooltip = await screen.findByRole('tooltip')
		expect(tooltip).toHaveTextContent('创建项目')
		expect(tooltip).not.toHaveTextContent('请先填写项目名称')
		expect(tooltip.querySelector('[data-slot="action-tooltip-shortcut"]')).toBeInTheDocument()
	})

	it('勾选创建更多后提交会清空名称描述、保留弹窗并显示计数', async () => {
		const onCreated = vi.fn()
		renderProjectCreate({ onCreated })

		fireEvent.change(screen.getByPlaceholderText('项目名称'), { target: { value: '项目 A' } })
		fireEvent.change(screen.getByPlaceholderText('添加项目说明…'), { target: { value: '说明 A' } })
		fireEvent.click(screen.getByRole('switch'))
		fireEvent.click(screen.getByRole('button', { name: '创建项目' }))

		await waitFor(() => expect(createProjectMock).toHaveBeenCalledTimes(1))
		expect(screen.getByPlaceholderText('项目名称')).toHaveValue('')
		expect(screen.getByPlaceholderText('添加项目说明…')).toHaveValue('')
		expect(screen.getByText('已创建 1 个项目')).toBeInTheDocument()
		expect(onCreated).not.toHaveBeenCalled()
	})

	it('普通创建完成后将新项目交给壳层导航', async () => {
		const onCreated = vi.fn()
		renderProjectCreate({ onCreated })

		fireEvent.change(screen.getByPlaceholderText('项目名称'), { target: { value: '项目 A' } })
		fireEvent.click(screen.getByRole('button', { name: '创建项目' }))

		await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 'project-created' }))
	})

	it('submitAndOpen 在项目创建中禁用，submitAndContinue 可用', async () => {
		renderProjectCreate({ withActions: true })

		fireEvent.change(screen.getByPlaceholderText('项目名称'), { target: { value: '项目 B' } })
		fireEvent.click(screen.getByRole('button', { name: '执行打开提交' }))

		await waitFor(() =>
			expect(screen.getByTestId('open-disabled-reason')).toHaveTextContent(
				'当前表单不支持创建并打开',
			),
		)
		expect(createProjectMock).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: '执行继续提交' }))
		await waitFor(() => expect(createProjectMock).toHaveBeenCalledTimes(1))
		expect(screen.getByText('已创建 1 个项目')).toBeInTheDocument()
	})
})

function renderProjectCreate({
	onCreated = vi.fn(),
	withActions = false,
}: {
	onCreated?: (project: { id: string }) => void
	withActions?: boolean
} = {}) {
	return render(
		<SubmitRegistryProvider>
			<ProjectCreateContent onClose={vi.fn()} onCreated={onCreated} selectedSpaceId='space-a' />
			{withActions ? <SubmitActionProbe /> : null}
		</SubmitRegistryProvider>,
	)
}

function SubmitActionProbe() {
	const actions = useSubmitRegistryActions()
	const [openReason, setOpenReason] = useState<string | null>(null)

	return (
		<div>
			<button onClick={() => void actions.submitActiveTarget('continue')} type='button'>
				执行继续提交
			</button>
			<button
				onClick={async () => {
					const submitted = await actions.submitActiveTarget('open')
					if (!submitted) {
						setOpenReason('当前表单不支持创建并打开')
					}
				}}
				type='button'
			>
				执行打开提交
			</button>
			{openReason ? <span data-testid='open-disabled-reason'>{openReason}</span> : null}
		</div>
	)
}
