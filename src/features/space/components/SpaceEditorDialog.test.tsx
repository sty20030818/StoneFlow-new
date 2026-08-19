import { fireEvent, screen, waitFor } from '@testing-library/react'
import { useMemo, useState } from 'react'

import {
	SubmitRegistryProvider,
	useRegisterSubmitTarget,
	useSubmitRegistryContext,
} from '@/features/submit'
import { renderWithInteractionProviders as render } from '@/test/TestInteractionProviders'
import { SpaceEditorDialog } from './SpaceEditorDialog'

describe('SpaceEditorDialog', () => {
	it('新建弹窗可以稳定渲染', () => {
		render(
			<SpaceEditorDialog
				mode='create'
				open
				onClose={() => undefined}
				onSubmit={async () => undefined}
			/>,
		)

		expect(screen.getByRole('dialog', { name: '新建 Space' })).toBeInTheDocument()
		expect(screen.getByRole('combobox', { name: '图标' })).toBeInTheDocument()
		expect(screen.getByRole('combobox', { name: '颜色' })).toBeInTheDocument()
	})

	it('编辑弹窗可以稳定渲染', async () => {
		render(
			<SpaceEditorDialog
				mode='edit'
				open
				space={{
					id: 'space-1',
					name: '个人',
					iconKey: 'user',
					colorKey: 'blue',
					isDefault: true,
					position: 100,
					archivedAt: null,
					deletedAt: null,
					createdAt: '2026-04-30T00:00:00.000Z',
					updatedAt: '2026-04-30T00:00:00.000Z',
				}}
				onClose={() => undefined}
				onSubmit={async () => undefined}
			/>,
		)

		expect(screen.getByRole('dialog', { name: '编辑 Space' })).toBeInTheDocument()
		expect(await screen.findByDisplayValue('个人')).toBeInTheDocument()
	})

	it('在提交注册上下文中输入名称时不会触发无限更新', async () => {
		render(
			<SubmitRegistryProvider>
				<SpaceEditorDialog
					mode='create'
					open
					onClose={() => undefined}
					onSubmit={async () => undefined}
				/>
			</SubmitRegistryProvider>,
		)

		const input = screen.getByLabelText('名称')
		fireEvent.change(input, { target: { value: '工作' } })

		await waitFor(() => {
			expect(input).toHaveValue('工作')
			expect(screen.getByText('工作')).toBeInTheDocument()
		})
	})

	it('提交注册目标更新时不会反复抖动 active target', () => {
		render(
			<SubmitRegistryProvider>
				<SubmitTargetProbe />
			</SubmitRegistryProvider>,
		)

		fireEvent.change(screen.getByLabelText('probe-input'), { target: { value: 'A' } })
		fireEvent.change(screen.getByLabelText('probe-input'), { target: { value: 'AB' } })

		expect(screen.getByTestId('active-target')).toHaveTextContent('probe-target')
		expect(screen.getByLabelText('probe-input')).toHaveValue('AB')
	})
})

function SubmitTargetProbe() {
	const [value, setValue] = useState('')
	const submitState = useSubmitRegistryContext()
	const target = useMemo(
		() => ({
			id: 'probe-target',
			title: 'Probe',
			priority: 100,
			canSubmit: value.trim().length > 0,
			submit: async () => undefined,
			context: { source: 'space-editor' as const },
		}),
		[value],
	)

	useRegisterSubmitTarget(target)

	return (
		<div>
			<input
				aria-label='probe-input'
				onChange={(event) => setValue(event.currentTarget.value)}
				value={value}
			/>
			<div data-testid='active-target'>{submitState.activeTarget?.id ?? 'none'}</div>
		</div>
	)
}
