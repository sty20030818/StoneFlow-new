/**
 * 撤掉 index.html 静态开屏遮罩（`#sf-boot-shell`）。
 *
 * 须在「等价 UI 已写入 DOM」之后调用（骨架 / 真壳 / Launcher 的 `useLayoutEffect`），
 * 不要在 App 根挂载时调用——那时路由常尚未渲染，会露出全灰空窗。
 */
export function dismissBootShell() {
	const bootShell = document.getElementById('sf-boot-shell')
	if (bootShell) {
		bootShell.remove()
	}
}
