import type { BadgeVariant } from '@/shared/ui/base/badge'

/**
 * 统一项目状态 badge 的视觉语义，避免页面、侧栏和 command 各自分叉。
 */
export function getProjectStatusBadgeVariant(status?: string | null): BadgeVariant {
	switch (status?.toLowerCase()) {
		case 'active':
			return 'primary'
		case 'paused':
			return 'warning'
		case 'blocked':
		case 'failed':
		case 'error':
			return 'destructive'
		default:
			return 'secondary'
	}
}

/**
 * 执行态任务只区分待执行与已完成，两者分别映射为中性与 soft success。
 */
export function getTaskStatusBadgeVariant(status: 'todo' | 'done'): BadgeVariant {
	return status === 'done' ? 'success' : 'secondary'
}
