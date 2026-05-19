import { useEffect } from 'react'

// 模态层抑制闸门：使用模块级引用计数，记录当前打开的模态层数量。
// 命令快捷键系统在 keydown 入口读取该状态，若有任意模态层打开则整体禁用全局快捷键。
// 之所以用 ref 计数而非 React state，是因为全局 keydown handler 通常持有过期闭包，
// 直接读 ref 可保证拿到最新值；同时支持嵌套（理论上）模态层叠加。

let openModalCount = 0

/**
 * 注册一个模态层的打开状态。
 * 仅在 `open` 为 true 时计入闸门，组件卸载或 open 变 false 时自动回收。
 */
export function useRegisterOpenModal(open: boolean) {
	useEffect(() => {
		if (!open) {
			return
		}

		openModalCount += 1
		return () => {
			openModalCount = Math.max(0, openModalCount - 1)
		}
	}, [open])
}

/**
 * 当前是否存在打开的模态层。命令快捷键系统应在 keydown 入口调用此函数早退。
 */
export function isAnyModalOpen(): boolean {
	return openModalCount > 0
}

/**
 * 仅用于测试场景的重置入口，避免跨用例脏数据。
 */
export function __resetModalGuardForTests() {
	openModalCount = 0
}
