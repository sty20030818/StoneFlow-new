// 全局 chord 进行中标志：当全局快捷键系统（use-command-shortcuts）进入 chord 前缀等待态时置为 true，
// chord 完成、取消或超时后重置为 false。
// TaskRowShortcutScope 等行内作用域在 isBlockedByHigherLayer 中读取此状态，
// 避免 chord 第二键（如 f→p 中的 p）被行内单键命令（如 taskSetPriority）同时消费。
// 与 modal-guard 相同，使用模块级变量而非 React state，确保 window keydown 闭包可拿到最新值。

let globalChordPending = false

export function setGlobalChordPending(pending: boolean) {
	globalChordPending = pending
}

export function isGlobalChordPending(): boolean {
	return globalChordPending
}

/** 仅用于测试场景的重置，避免跨用例脏数据。 */
export function __resetGlobalChordGuardForTests() {
	globalChordPending = false
}
