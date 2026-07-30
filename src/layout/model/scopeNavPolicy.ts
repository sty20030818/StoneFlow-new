/**
 * All scope 与单 Space 的侧栏导航策略（纯函数，无 UI）。
 * 产品：所有空间 = 任务执行台，不承担项目树 / 独立事项主入口。
 */
import type { Scope } from '@/shared/types'

export type ShellMainNavPolicyKey = 'tasks' | 'views' | 'projectOverview'

export function isAllScope(scope: Scope): boolean {
	return scope.type === 'all'
}

/** 主导航项在当前 scope 下是否应对用户可见（在 settings 可见之上再裁一层）。 */
export function isShellMainNavAllowed(scope: Scope, key: ShellMainNavPolicyKey): boolean {
	if (isAllScope(scope) && key === 'projectOverview') {
		return false
	}
	return true
}

/** 侧栏「项目列表」区（含独立事项行）：仅单 Space 展示。 */
export function shouldShowSidebarProjectSection(scope: Scope, settingsVisible: boolean): boolean {
	return settingsVisible && scope.type === 'space'
}
