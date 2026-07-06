/**
 * 更新模块 UI 状态管理（Zustand）。
 *
 * 管理更新弹窗的显示、下载进度、错误信息等前端 UI 状态。
 * 不直接调用 Tauri invoke，通过 hooks 层触发 API 调用后更新此 store。
 */

import { create } from 'zustand'
import type { UpdateInfo, UpdateStatus } from '@/features/update/api/updates'

interface UpdateState {
	/** 弹窗是否可见 */
	dialogVisible: boolean
	/** 当前更新信息 */
	updateInfo: UpdateInfo | null
	/** 当前状态 */
	status: UpdateStatus
	/** 用户是否已跳过当前版本（本次会话内） */
	dismissedVersion: string | null

	/** 打开更新弹窗并设置更新信息 */
	showUpdate: (info: UpdateInfo) => void
	/** 更新状态 */
	setStatus: (status: UpdateStatus) => void
	/** 关闭弹窗（不跳过版本） */
	closeDialog: () => void
	/** 跳过当前版本并关闭弹窗 */
	skipAndClose: () => void
	/** 重置为初始状态 */
	reset: () => void
}

const initialStatus: UpdateStatus = { status: 'idle' }

export const useUpdateStore = create<UpdateState>((set, get) => ({
	dialogVisible: false,
	updateInfo: null,
	status: initialStatus,
	dismissedVersion: null,

	showUpdate: (info) => {
		// 如果用户已经跳过了这个版本，不弹窗
		if (get().dismissedVersion === info.version) {
			return
		}
		set({
			dialogVisible: true,
			updateInfo: info,
			status: { status: 'updateAvailable', ...info },
		})
	},

	setStatus: (status) => {
		set({ status })
	},

	closeDialog: () => {
		set({ dialogVisible: false })
	},

	skipAndClose: () => {
		const { updateInfo } = get()
		set({
			dialogVisible: false,
			dismissedVersion: updateInfo?.version ?? null,
		})
	},

	reset: () => {
		set({
			dialogVisible: false,
			updateInfo: null,
			status: initialStatus,
			dismissedVersion: null,
		})
	},
}))
