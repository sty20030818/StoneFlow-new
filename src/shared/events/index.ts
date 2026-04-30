// Tauri IPC 事件：taskChanged
export {
	TASKS_CHANGED_EVENT,
	type TaskChangedPayload,
	normalizeTaskChangedPayload,
	isTaskChangedForScope,
	subscribeToTaskChanged,
	useTaskChangedListener,
} from './taskChanged'

// Tauri IPC 事件：commandOpen
export {
	COMMAND_OPEN_EVENT,
	type CommandOpenPayload,
	normalizeCommandOpenPayload,
	subscribeToCommandOpen,
	useCommandOpenListener,
} from './commandOpen'

// 前端内部事件总线
export {
	useEventBus,
	emitEvent,
	useEventSubscription,
	type AppEvent,
	type AppEventType,
} from './eventBus'
