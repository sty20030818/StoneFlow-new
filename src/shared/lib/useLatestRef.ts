import { useLayoutEffect, useRef } from 'react'

/**
 * 通过 useLayoutEffect 同步最新值到 ref，供事件监听 / 订阅回调读取。
 * 避免在 render 中写 ref.current（react-doctor/no-ref-current-in-render）。
 */
export function useLatestRef<T>(value: T) {
	const ref = useRef(value)
	useLayoutEffect(() => {
		ref.current = value
	})
	return ref
}
