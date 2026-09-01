import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { LabelsPreview } from '../ticket-05/collectionsAndTaskSamples'
import { TaskMetadataReviewFixture } from './taskCollectionCompositionSamples'

describe('第十二批产品组合样本', () => {
	it('元数据样本明确区分可编辑入口与只读值', () => {
		render(<TaskMetadataReviewFixture />)

		expect(screen.getByRole('button', { name: '优先级' })).toBeInTheDocument()
		expect(screen.getByText('空值（只读）')).toBeInTheDocument()
		expect(screen.getByText('长文本（只读）')).toBeInTheDocument()
		expect(screen.getByLabelText('空元数据值')).not.toHaveAttribute('role', 'button')
		expect(screen.getByLabelText('长元数据值')).not.toHaveAttribute('role', 'button')
	})

	it('无标签时只显示带图标的新增标签按钮', async () => {
		render(<LabelsPreview />)

		for (const label of ['Bug', '123']) {
			fireEvent.click(screen.getByRole('button', { name: '编辑任务标签' }))
			const item = within(await screen.findByRole('menu', { name: '编辑任务标签' })).getByRole(
				'menuitemcheckbox',
				{ name: label },
			)
			fireEvent.pointerDown(item)
			fireEvent.click(item)
			await waitFor(() =>
				expect(screen.queryByRole('menu', { name: '编辑任务标签' })).not.toBeInTheDocument(),
			)
		}

		const addLabel = screen.getByRole('button', { name: '新增标签' })
		expect(addLabel).toHaveTextContent('新增标签')
		expect(addLabel.querySelector('svg')).not.toBeNull()
		expect(screen.queryByText('暂无标签')).not.toBeInTheDocument()
		expect(screen.getByRole('status')).toHaveTextContent('已选择标签：无')
	})
})
