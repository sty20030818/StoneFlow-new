import {
	SHELL_CHROME_ACTION_KEYS,
	type ShellCommandActions,
	type ShellCommandAdapter,
} from '@/features/command'

/**
 * 合并各 slice 的 Partial actions。
 * DEV 只校验壳 chrome 最小集；域方法由各 `register*Commands` 贡献，缺则 bind 侧禁用命令。
 */
export function composeShellCommandActions(
	...slices: Array<Partial<ShellCommandActions>>
): ShellCommandAdapter {
	const merged = Object.assign({}, ...slices) as Partial<ShellCommandActions>

	if (import.meta.env.DEV) {
		const missing = SHELL_CHROME_ACTION_KEYS.filter((key) => typeof merged[key] !== 'function')
		if (missing.length > 0) {
			throw new Error(`ShellCommandActions 缺少壳 chrome 方法: ${missing.join(', ')}`)
		}
	}

	return merged as ShellCommandAdapter
}
