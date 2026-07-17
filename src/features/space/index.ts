/**
 * @fileoverview **space · 唯一对外公共面（`@/features/space`）**
 *
 * Space 实体：可见列表、scope/active、视觉 tokens、编辑对话框。
 *
 * 外模块：`import { … } from '@/features/space'`
 * 禁止：`@/features/space/api|hooks|model|components/…`
 */

// ── Hooks ───────────────────────────────────────────────────────────────────

export {
	useSpaces,
	useVisibleSpacesQuery,
	useCreateSpaceMutation,
	useUpdateSpaceMutation,
	useSetDefaultSpaceMutation,
	useArchiveSpaceMutation,
	useRestoreSpaceMutation,
	useDeleteSpaceMutation,
	spaceKeys,
} from './hooks'

// ── API ─────────────────────────────────────────────────────────────────────

export type { ActiveScopePayload } from './api/spaces'

export {
	listVisibleSpaces,
	createSpace,
	updateSpace,
	setDefaultSpace,
	archiveSpace,
	restoreSpace,
	deleteSpace,
	setActiveScope,
} from './api/spaces'

// ── 视觉（侧栏 / metadata / 历史） ──────────────────────────────────────────

export type { SpaceVisualDefinition } from './model/spaceVisuals'

export {
	SPACE_ICON_OPTIONS,
	SPACE_COLOR_OPTIONS,
	getSpaceIconOption,
	getSpaceColorOption,
	getSpaceVisual,
} from './model/spaceVisuals'

// ── 官方组件 ────────────────────────────────────────────────────────────────

/** Space 新建/编辑对话框（侧栏入口）。 */
export { SpaceEditorDialog } from './components/SpaceEditorDialog'
