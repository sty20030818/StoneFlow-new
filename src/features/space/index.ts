/**
 * space 域对外公共面（`@/features/space`）。
 *
 * @remarks
 * 外模块只能：`import { … } from '@/features/space'`。
 * 禁止深路径进 api/hooks/model/components。
 * Space 实体 + 视觉 + 编辑 UI；setActiveScope 仅同步 Rust（URL 仍是 scope 真相）。
 * 命令打开意图在 `@/features/command`（takePendingCommandOpenIntent）。
 */

// ── Hooks ───────────────────────────────────────────────────────────────────

export {
	useSpaces,
	useVisibleSpacesQuery,
	useCreateSpaceMutation,
	useUpdateSpaceMutation,
	useSetDefaultSpaceMutation,
	useArchiveSpaceMutation,
	useDeleteSpaceMutation,
	spaceKeys,
} from './hooks'

// ── API ─────────────────────────────────────────────────────────────────────

/** 可见列表（routes ensure / loader）。 */
export { listVisibleSpaces } from './api/spaces'

/** lifecycle 写路径委托。 */
export { deleteSpace, restoreSpace } from './api/spaces'

/**
 * 把当前 Scope 同步给 Rust 运行时。
 * 调用方仅 ShellRouteLayout；勿当第二套导航真相。
 */
export { setActiveScope } from './api/spaces'

// ── 视觉（侧栏 / metadata / 历史） ──────────────────────────────────────────

export type { SpaceVisualDefinition } from './model/spaceVisuals'

/** 空间图标色单源（侧栏 / metadata / launcher 等）。 */
export { getSpaceVisual } from './model/spaceVisuals'

// ── UI ──────────────────────────────────────────────────────────────────────

/** Space 新建/编辑对话框（侧栏入口）。 */
export { SpaceEditorDialog } from './components/SpaceEditorDialog'
