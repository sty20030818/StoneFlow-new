import { getSectionLabel, getSpaceLabel, resolveShellSection } from '@/app/layouts/shell/config'

describe('shell config helpers', () => {
	it('按路由解析主分区', () => {
		expect(resolveShellSection('/space/work/focus')).toBe('focus')
		expect(resolveShellSection('/space/work/project/stoneflow-v1')).toBe('project')
		expect(resolveShellSection('/space/work/trash')).toBe('trash')
		expect(resolveShellSection('/space/work/settings')).toBe('settings')
		expect(resolveShellSection('/space/work/inbox')).toBe('inbox')
	})

	it('为已知分区和空间返回标签', () => {
		expect(getSectionLabel('inbox')).toBe('Inbox')
		expect(getSectionLabel('focus')).toBe('Views')
		expect(getSectionLabel('settings')).toBe('Settings')
		expect(getSpaceLabel('work')).toBe('工作')
	})

	it('为未知值返回兜底标签', () => {
		expect(getSectionLabel('unknown' as never)).toBe('Workspace')
		expect(getSpaceLabel('unknown-space')).toBe('unknown-space')
	})
})
