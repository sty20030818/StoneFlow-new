import { isTauri } from '@tauri-apps/api/core'

export type TaskBoardBenchmarkAccess = {
	isProduction: boolean
	isEnabled: boolean
	isTauri: boolean
}

export function canAccessTaskBoardBenchmark({
	isProduction,
	isEnabled,
	isTauri: runsInTauri,
}: TaskBoardBenchmarkAccess) {
	return isProduction && isEnabled && runsInTauri
}

export function isTaskBoardBenchmarkEnabled() {
	return canAccessTaskBoardBenchmark({
		isProduction: import.meta.env.PROD,
		isEnabled: import.meta.env.VITE_TASK_BOARD_BENCHMARK === '1',
		isTauri: isTauri(),
	})
}
