import { invoke } from '@tauri-apps/api/core'

import type { Scope, Space } from '@/shared/types'

type ActiveScopeResponse = {
	activeScopeId: string
	scopeType: 'all' | 'space'
	spaceId: string | null
}

type CreateSpaceInput = {
	name: string
	iconKey: string
	colorKey: string
}

type UpdateSpaceInput = {
	spaceId: string
	name?: string
	iconKey?: string
	colorKey?: string
}

export type ActiveScopePayload = {
	activeScopeId: string
	scope: Scope
}

/**
 * 读取所有可见 Space。
 */
export async function listVisibleSpaces() {
	return invoke<Space[]>('list_visible_spaces')
}

/**
 * 创建一个新的 Space。
 */
export async function createSpace(input: CreateSpaceInput) {
	return invoke<Space>('create_space', {
		input: {
			name: input.name,
			iconKey: input.iconKey,
			colorKey: input.colorKey,
		},
	})
}

/**
 * 更新 Space 的基础展示字段。
 */
export async function updateSpace(input: UpdateSpaceInput) {
	return invoke<Space>('update_space', {
		input: {
			spaceId: input.spaceId,
			name: input.name,
			iconKey: input.iconKey,
			colorKey: input.colorKey,
		},
	})
}

/**
 * 切换默认 Space。
 */
export async function setDefaultSpace(spaceId: string) {
	return invoke<Space>('set_default_space', {
		input: { spaceId },
	})
}

/**
 * 归档 Space。
 */
export async function archiveSpace(spaceId: string) {
	return invoke<Space>('archive_space', {
		input: { spaceId },
	})
}

/**
 * 恢复 Space。
 */
export async function restoreSpace(spaceId: string) {
	return invoke<Space>('restore_space', {
		input: { spaceId },
	})
}

/**
 * 删除 Space。
 */
export async function deleteSpace(spaceId: string) {
	return invoke<Space>('delete_space', {
		input: { spaceId },
	})
}

/**
 * 把当前 Scope 同步给 Rust 侧运行时。
 */
export async function setActiveScope(scope: Scope): Promise<ActiveScopePayload> {
	const payload = await invoke<ActiveScopeResponse>('set_active_scope', {
		input:
			scope.type === 'all'
				? {
						scopeType: 'all',
						spaceId: null,
					}
				: {
						scopeType: 'space',
						spaceId: scope.spaceId,
					},
	})

	return {
		activeScopeId: payload.activeScopeId,
		scope:
			payload.scopeType === 'all'
				? { type: 'all' }
				: {
						type: 'space',
						spaceId: payload.spaceId ?? '',
					},
	}
}
