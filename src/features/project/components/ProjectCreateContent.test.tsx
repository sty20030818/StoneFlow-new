/** @vitest-environment jsdom */
import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { SubmitRegistryProvider, useSubmitRegistryActions } from '@/features/submit/model'
import { ProjectCreateContent } from './ProjectCreateContent'

const createProjectMock = vi.fn()

vi.mock('@/features/project/hooks', () => ({
	useCreateProjectMutation: () => ({
		mutateAsync: createProjectMock,
	}),
}))

describe('ProjectCreateContent', () => {
	beforeEach(() => {
		createProjectMock.mockReset()
		createProjectMock.mockResolvedValue({ id: 'project-created' })
	})

	it('勾选创建更多后提交会清空名称描述、保留弹窗并显示计数', async () => {
		renderProjectCreate()

		fireEvent.change(screen.getByPlaceholderText('项目名称'), { target: { value: '项目 A' } })
		fireEvent.change(screen.getByPlaceholderText('添加项目说明…'), { target: { value: '说明 A' } })
		fireEvent.click(screen.getByRole('switch'))
		fireEvent.click(screen.getByRole('button', { name: '创建项目' }))

		await waitFor(() => expect(createProjectMock).toHaveBeenCalledTimes(1))
		expect(screen.getByPlaceholderText('项目名称')).toHaveValue('')
		expect(screen.getByPlaceholderText('添加项目说明…')).toHaveValue('')
		expect(screen.getByText('已创建 1 个项目')).toBeInTheDocument()
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

	it('描述输入区位于统一滚动容器内', () => {
		renderProjectCreate()

		const scrollContainer = screen
			.getByPlaceholderText('添加项目说明…')
			.closest('[data-scroll-container="true"]')

		expect(scrollContainer).toHaveAttribute('data-scroll-container', 'true')
		expect(scrollContainer?.className).toContain('px-5')
	})
})

function renderProjectCreate({
	withActions = false,
}: {
	withActions?: boolean
} = {}) {
	return render(
		<SubmitRegistryProvider>
			<ProjectCreateContent onClose={vi.fn()} selectedSpaceId='space-a' />
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
