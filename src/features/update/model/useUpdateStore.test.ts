import { beforeEach, describe, expect, it } from 'vitest'

import type { UpdateSessionSnapshot } from '../api/updates'
import { selectReadyChipVisible, selectUpdateSnapshot, useUpdateStore } from './useUpdateStore'

function snapshot(
	revision: number,
	phase: UpdateSessionSnapshot['phase'] = 'idle',
): UpdateSessionSnapshot {
	return {
		revision,
		phase,
		update: phase === 'idle' ? null : { version: `0.2.${revision}`, channel: 'beta' as const },
		progress: phase === 'downloading' ? { downloaded: revision, total: 100 } : null,
		errorMessage: null,
	}
}

describe('useUpdateStore', () => {
	beforeEach(() => {
		useUpdateStore.getState().reset()
	})

	it('首次 hydrate 接受 revision 0', () => {
		expect(useUpdateStore.getState().applySnapshot(snapshot(0, 'available'))).toBe(true)
		expect(selectUpdateSnapshot(useUpdateStore.getState()).phase).toBe('available')
	})

	it('拒绝相同或更旧 revision，避免迟到事件回写', () => {
		const store = useUpdateStore.getState()
		expect(store.applySnapshot(snapshot(2, 'ready'))).toBe(true)
		expect(store.applySnapshot(snapshot(2, 'downloading'))).toBe(false)
		expect(store.applySnapshot(snapshot(1, 'available'))).toBe(false)

		expect(useUpdateStore.getState().snapshot).toMatchObject({ revision: 2, phase: 'ready' })
	})

	it('安装失败回到同一 Ready 时重新展示 chip，并保留原版本和错误', () => {
		const store = useUpdateStore.getState()
		store.applySnapshot({
			revision: 1,
			phase: 'ready',
			update: { version: '0.2.0-beta.4', channel: 'beta' },
			progress: null,
			errorMessage: null,
		})
		store.dismissReadyChip()
		expect(selectReadyChipVisible(useUpdateStore.getState())).toBe(false)

		store.applySnapshot({
			revision: 2,
			phase: 'installing',
			update: { version: '0.2.0-beta.4', channel: 'beta' },
			progress: null,
			errorMessage: null,
		})
		store.applySnapshot({
			revision: 3,
			phase: 'ready',
			update: { version: '0.2.0-beta.4', channel: 'beta' },
			progress: null,
			errorMessage: '系统安装器拒绝了安装包',
		})

		expect(selectReadyChipVisible(useUpdateStore.getState())).toBe(true)
		expect(useUpdateStore.getState().snapshot).toMatchObject({
			phase: 'ready',
			update: { version: '0.2.0-beta.4', channel: 'beta' },
			errorMessage: '系统安装器拒绝了安装包',
		})
	})

	it('主动打开可覆盖同 revision 的自动弹窗关闭标记', () => {
		const store = useUpdateStore.getState()
		store.applySnapshot(snapshot(1, 'available'))
		store.closeDialog()
		useUpdateStore.getState().openDialogFromSnapshot(1)
		expect(useUpdateStore.getState().dialogVisible).toBe(false)

		useUpdateStore.getState().openDialog()
		expect(useUpdateStore.getState().dialogVisible).toBe(true)
	})
})
