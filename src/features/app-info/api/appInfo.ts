import { getVersion } from '@tauri-apps/api/app'
import { openUrl } from '@tauri-apps/plugin-opener'

/** 读取运行中应用的版本号。 */
export function getAppVersion() {
	return getVersion()
}

/** 通过系统默认浏览器打开已确认的应用资料地址。 */
export function openAppInfoUrl(url: string) {
	return openUrl(url)
}
