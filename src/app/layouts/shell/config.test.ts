import { getSectionLabel, getSpaceLabel, resolveShellSection } from '@/app/layouts/shell/config'

describe('shell config helpers', () => {
	it('按路由解析主分区', () => {
		expect(resolveShellSection('/space/default/focus')).toBe('focus')
		expect(resolveShellSection('/space/default/project/stoneflow-v1')).toBe('project')
		expect(resolveShellSection('/space/default/trash')).toBe('trash')
		expect(resolveShellSection('/space/default/inbox')).toBe('inbox')
	})

	it('为已知分区和空间返回标签', () => {
		expect(getSectionLabel('inbox')).toBe('Inbox')
		expect(getSpaceLabel('default')).toBe('工作')
	})

	it('为未知值返回兜底标签', () => {
		expect(getSectionLabel('unknown' as never)).toBe('Workspace')
		expect(getSpaceLabel('unknown-space')).toBe('unknown-space')
	})
})
