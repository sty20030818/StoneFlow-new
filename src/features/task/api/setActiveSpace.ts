import { invoke } from '@tauri-apps/api/core'

type SetActiveSpaceResponse = {
	active_space_id: string
	space_slug: string
}

export type ActiveSpacePayload = {
	activeSpaceId: string
	spaceSlug: string
}

/**
 * 将主应用当前 Space 同步给 Rust 侧运行时状态。
 */
export async function setActiveSpace(spaceSlug: string) {
	const payload = await invoke<SetActiveSpaceResponse>('set_active_space', {
		input: {
			space_slug: spaceSlug,
		},
	})

	return {
		activeSpaceId: payload.active_space_id,
		spaceSlug: payload.space_slug,
	} satisfies ActiveSpacePayload
}
