import { useLayoutEffect, useRef } from 'react'

/**
 * 在 layout 阶段同步最新值到 ref，供事件监听 / 订阅回调读取。
 * 避免在 render 阶段写 ref.current（react-doctor/no-ref-current-in-render）。
 */
export function useLatestRef<T>(value: T) {
	const ref = useRef(value)
	useLayoutEffect(() => {
		ref.current = value
	})
	return ref
}
