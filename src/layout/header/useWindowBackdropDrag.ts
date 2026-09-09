import { useEffect, type RefObject } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

const BACKDROP_SELECTOR =
	'[data-slot="modal-backdrop"], [data-slot="alert-dialog-backdrop"], [data-slot="command-backdrop"], [data-slot="sheet-backdrop"]'

/** 遮罩只隔离业务操作，不占用窗口顶栏的拖动能力。 */
export function useWindowBackdropDrag(headerRef: RefObject<HTMLElement | null>) {
	useEffect(() => {
		if (!isTauri()) return

		const onBackdropPointer = (event: MouseEvent) => {
			const target = event.target
			const header = headerRef.current
			if (
				event.button !== 0 ||
				event.defaultPrevented ||
				!header ||
				!(target instanceof HTMLElement)
			)
				return
			// 嵌套浮层会把背景遮罩设为 inert，浏览器此时将外点命中到 body。
			const isInertBackground = target === document.body && header.closest('[inert]') !== null
			if (!target.matches(BACKDROP_SELECTOR) && !isInertBackground) return

			const rect = header.getBoundingClientRect()
			if (
				event.clientX < rect.left ||
				event.clientX >= rect.right ||
				event.clientY < rect.top ||
				event.clientY >= rect.bottom
			)
				return

			// 先于 document 上的外点监听消费手势；不让拖动后的 click 关闭浮层或转移焦点。
			event.preventDefault()
			event.stopPropagation()
			if (event.type === 'pointerdown') {
				void getCurrentWindow()
					.startDragging()
					.catch((error) => {
						console.error('窗口拖动失败', error)
					})
			}
		}

		window.addEventListener('pointerdown', onBackdropPointer, true)
		window.addEventListener('click', onBackdropPointer, true)
		return () => {
			window.removeEventListener('pointerdown', onBackdropPointer, true)
			window.removeEventListener('click', onBackdropPointer, true)
		}
	}, [headerRef])
}
