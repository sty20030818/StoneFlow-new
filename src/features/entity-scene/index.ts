/**
 * entity-scene · 页级槽位编排
 *
 * 供 domain 列表页组装 MainCard 槽位；通过 adapter 调用 task/project/lifecycle 的 public Board。
 */

export { EntityScene } from './EntityScene'
export type {
	EntitySceneBoardSlotProps,
	EntitySceneLifecycleBoardActions,
	EntitySceneLifecycleBoardConfig,
	EntitySceneLifecycleBoardData,
	EntitySceneProjectBoardActions,
	EntitySceneProjectBoardConfig,
	EntitySceneProjectBoardData,
	EntitySceneTaskBoardActions,
	EntitySceneTaskBoardConfig,
	EntitySceneTaskBoardData,
} from './types'
