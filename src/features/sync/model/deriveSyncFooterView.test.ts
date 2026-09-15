import { describe, expect, it } from 'vitest'

import { deriveSyncFooterView } from '@/features/sync/model/deriveSyncFooterView'

describe('deriveSyncFooterView', () => {
	it('synced + remote：已同步，动作可点', () => {
		const view = deriveSyncFooterView({
			displayedStatus: 'synced',
			loading: false,
			running: false,
			message: null,
			statusPayload: { credentialState: 'available', hasRemoteConfig: true, replicaState: 'ready' },
		})
		expect(view.label).toBe('已同步')
		expect(view.actionDisabled).toBe(false)
		expect(view.busy).toBe(false)
		expect(view.actionLabel).toBe('立即同步')
	})

	it('未配置远端：未配置 + 动作禁用', () => {
		const view = deriveSyncFooterView({
			displayedStatus: 'disabled',
			loading: false,
			running: false,
			message: null,
			statusPayload: {
				credentialState: 'missing',
				hasRemoteConfig: false,
				replicaState: 'uninitialized',
			},
		})
		expect(view.label).toBe('未配置')
		expect(view.actionDisabled).toBe(true)
		expect(view.title).toContain('设置')
	})

	it('缺少基线仍允许通过普通同步建立基线', () => {
		const view = deriveSyncFooterView({
			displayedStatus: 'error',
			loading: false,
			running: false,
			message: null,
			statusPayload: {
				credentialState: 'available',
				hasRemoteConfig: true,
				replicaState: 'baseline_required',
			},
		})
		expect(view.label).toBe('缺少基线')
		expect(view.actionDisabled).toBe(false)
		expect(view.tone.color).toBe('warning')
	})

	it('绑定损坏时显示异常并阻断普通同步', () => {
		const view = deriveSyncFooterView({
			displayedStatus: 'needs_attention',
			loading: false,
			running: false,
			message: null,
			statusPayload: {
				credentialState: 'available',
				hasRemoteConfig: true,
				replicaState: 'diverged',
			},
		})
		expect(view.label).toBe('状态异常')
		expect(view.actionDisabled).toBe(true)
		expect(view.tone.color).toBe('danger')
	})

	it('running：busy + 同步中 label on action', () => {
		const view = deriveSyncFooterView({
			displayedStatus: 'synced',
			loading: false,
			running: true,
			message: null,
			statusPayload: { credentialState: 'available', hasRemoteConfig: true, replicaState: 'ready' },
		})
		expect(view.busy).toBe(true)
		expect(view.actionDisabled).toBe(true)
		expect(view.actionLabel).toBe('同步中')
	})

	it('message 优先作为 title', () => {
		const view = deriveSyncFooterView({
			displayedStatus: 'error',
			loading: false,
			running: false,
			message: '网络超时',
			statusPayload: { credentialState: 'available', hasRemoteConfig: true, replicaState: 'ready' },
		})
		expect(view.title).toBe('网络超时')
		expect(view.label).toBe('同步失败')
	})

	it('凭据不可用时不伪装成未配置', () => {
		const view = deriveSyncFooterView({
			displayedStatus: 'needs_attention',
			loading: false,
			running: false,
			message: null,
			statusPayload: {
				credentialState: 'unavailable',
				hasRemoteConfig: false,
				replicaState: 'uninitialized',
			},
		})
		expect(view.label).toBe('凭据异常')
		expect(view.title).toContain('无法访问同步凭据')
	})
})
