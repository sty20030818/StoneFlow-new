const removedValue = Symbol('removedLocalStorageValue')
const failedWriteOverlay = new Map<string, unknown | typeof removedValue>()

/** 读取 renderer 自有的小型 JSON 偏好；Web Storage 不可用时回退到当前会话。 */
export function readLocalStorageValue<T>(key: string): T | null {
	if (failedWriteOverlay.has(key)) {
		const value = failedWriteOverlay.get(key)
		return value === removedValue ? null : (value as T)
	}
	try {
		const raw = localStorage.getItem(key)
		if (raw === null) return null
		return JSON.parse(raw) as T
	} catch {
		return null
	}
}

/** 写入 renderer 自有的小型 JSON 偏好。 */
export function writeLocalStorageValue(key: string, value: unknown): void {
	try {
		localStorage.setItem(key, JSON.stringify(value))
		failedWriteOverlay.delete(key)
	} catch {
		failedWriteOverlay.set(key, value)
	}
}

/** 删除 renderer 自有的小型 JSON 偏好。 */
export function removeLocalStorageValue(key: string): void {
	try {
		localStorage.removeItem(key)
		failedWriteOverlay.delete(key)
	} catch {
		failedWriteOverlay.set(key, removedValue)
	}
}
