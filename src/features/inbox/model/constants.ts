export const INBOX_PRIORITY_OPTIONS = [
	{ value: 'low', label: '低' },
	{ value: 'medium', label: '中' },
	{ value: 'high', label: '高' },
	{ value: 'urgent', label: '紧急' },
] as const

export function formatInboxPriorityLabel(priority: string | null | undefined) {
	return INBOX_PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? '待补优先级'
}
