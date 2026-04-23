import { render, screen } from '@testing-library/react'

import { ProjectCreateDialog } from '@/features/project/ui/ProjectCreateDialog'

describe('ProjectCreateDialog', () => {
	it('渲染正式的新建项目弹窗', () => {
		render(<ProjectCreateDialog currentSpaceId='work' onClose={vi.fn<() => void>()} open />)

		expect(screen.getByText('新建项目')).toBeInTheDocument()
		expect(screen.getByLabelText('项目名称')).toBeInTheDocument()
		expect(screen.getByLabelText('项目说明')).toBeInTheDocument()
	})
})
