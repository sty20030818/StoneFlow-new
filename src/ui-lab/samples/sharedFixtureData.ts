export const CANDIDATE_PRIORITY_OPTIONS = [
	{ value: 'none', label: '无优先级', isEmptyValue: true },
	{ value: 'high', label: '高' },
	{ value: 'medium', label: '中' },
	{ value: 'low', label: '低' },
]

export const CANDIDATE_VIEW_OPTIONS = [
	{ id: 'all', label: '全部' },
	{ id: 'mine', label: '我的任务' },
] as const

export const LABEL_OPTIONS = [
	{ id: 'bug', label: 'Bug', color: '#f2555a' },
	{ id: '123', label: '123', color: '#48b782' },
	{ id: 'feature', label: 'Feature', color: '#a879f7' },
	{ id: 'improvement', label: 'Improvement', color: '#4c9ff8' },
] as const
