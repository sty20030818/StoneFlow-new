import { render, screen } from '@testing-library/react'

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

	it('编辑弹窗可以稳定渲染', () => {
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
					sortOrder: 100,
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
		expect(screen.getByDisplayValue('个人')).toBeInTheDocument()
	})
})
