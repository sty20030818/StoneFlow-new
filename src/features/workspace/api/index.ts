/**
 * 工作区 API
 * 统一的数据访问层，mock 全删后替换为真实 API
 */

export type {
	TaskPriority,
	TaskStatus,
	Task,
	TaskView,
	FocusViewKey,
	TrashEntry,
	TaskResource,
	SearchTaskItem,
	SearchProjectItem,
} from '@/shared/types'

export {
	getInboxTasks,
	getFocusTasks,
	getSearchResults,
	getTaskRecord,
	getTaskResources,
	FOCUS_VIEWS,
	TRASH_ENTRIES,
	TASK_RECORDS,
} from '@/features/workspace-shell/model/shellData'
