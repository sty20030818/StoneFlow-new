// 全局 chord 进行中标志：进入 chord 前缀等待态时置为 true，完成、取消或超时后重置。
// 单一快捷键分发器据此跳过 row/list 高优先级处理器，确保第二键只进入 global 会话；
// 行交互 guard 也会读取它，覆盖非键盘入口的高层阻断判断。
// 使用模块级变量确保原生事件分发阶段同步可见。

let globalChordPending = false

export function setGlobalChordPending(pending: boolean) {
	globalChordPending = pending
}

export function isGlobalChordPending(): boolean {
	return globalChordPending
}
