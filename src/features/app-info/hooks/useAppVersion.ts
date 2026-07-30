import { useEffect, useState } from 'react'

import { getAppVersion } from '../api/appInfo'

/**
 * 读取当前运行包的版本号。
 *
 * 浏览器预览与测试环境可能没有 Tauri API；调用失败只影响信息展示，不能阻塞关于窗口。
 */
export function useAppVersion() {
	const [version, setVersion] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [hasError, setHasError] = useState(false)

	useEffect(() => {
		let disposed = false

		void getAppVersion()
			.then((nextVersion) => {
				if (!disposed) setVersion(nextVersion)
			})
			.catch(() => {
				if (!disposed) setHasError(true)
			})
			.finally(() => {
				if (!disposed) setIsLoading(false)
			})

		return () => {
			disposed = true
		}
	}, [])

	return { version, isLoading, hasError }
}
