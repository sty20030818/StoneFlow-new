import type { CommandId } from '@/features/command/core'

import type {
	Keybinding,
	KeybindingConflict,
	KeybindingScope,
	KeybindingSequence,
	KeybindingStroke,
	ShortcutPlatform,
} from './keybinding.types'

const SHORTCUT_PLATFORMS: readonly ShortcutPlatform[] = ['mac', 'windows', 'linux']

type KeybindingQuery = {
	commandId: CommandId
	scope: KeybindingScope
}

export class KeybindingRegistryConflictError extends Error {
	readonly conflicts: readonly KeybindingConflict[]

	constructor(conflicts: readonly KeybindingConflict[]) {
		super(formatConflictMessage(conflicts))
		this.name = 'KeybindingRegistryConflictError'
		this.conflicts = conflicts
	}
}

/**
 * 快捷键不可变真源：构造阶段完成规范化校验，运行阶段只做索引查询。
 */
export class KeybindingRegistry {
	private readonly bindings: readonly Keybinding[]
	private readonly bindingsByScope: ReadonlyMap<KeybindingScope, readonly Keybinding[]>
	private readonly bindingsByCommandScope: ReadonlyMap<string, readonly Keybinding[]>

	constructor(bindings: readonly Keybinding[] = []) {
		const snapshot = bindings.map(cloneAndFreezeBinding)
		assertValidStrokes(snapshot)

		const conflicts = findConflicts(snapshot)
		if (conflicts.length > 0) {
			throw new KeybindingRegistryConflictError(conflicts)
		}

		assertExplicitPrimaryBindings(snapshot)

		this.bindings = Object.freeze(snapshot)
		this.bindingsByScope = buildScopeIndex(snapshot)
		this.bindingsByCommandScope = buildCommandScopeIndex(snapshot)
	}

	getAll(): readonly Keybinding[] {
		return this.bindings
	}

	getByScope(scope: KeybindingScope): readonly Keybinding[] {
		return this.bindingsByScope.get(scope) ?? []
	}

	resolvePrimary({ commandId, scope }: KeybindingQuery): Keybinding | null {
		const bindings = this.bindingsByCommandScope.get(getCommandScopeKey(commandId, scope)) ?? []
		return bindings.find((binding) => binding.display === 'primary') ?? null
	}

	resolveAll({ commandId, scope }: KeybindingQuery): readonly Keybinding[] {
		const bindings = this.bindingsByCommandScope.get(getCommandScopeKey(commandId, scope)) ?? []
		const primary = bindings.find((binding) => binding.display === 'primary')
		if (!primary) {
			return []
		}

		return [primary, ...bindings.filter((binding) => binding.display === 'alternative')]
	}
}

function cloneAndFreezeBinding(binding: Keybinding): Keybinding {
	const first = Object.freeze({ ...binding.sequence[0] })
	const sequence: KeybindingSequence =
		binding.sequence.length === 1
			? Object.freeze([first])
			: Object.freeze([first, Object.freeze({ ...binding.sequence[1] })])
	return Object.freeze({ ...binding, sequence: Object.freeze(sequence) })
}

function assertValidStrokes(bindings: readonly Keybinding[]) {
	for (const binding of bindings) {
		for (const stroke of binding.sequence) {
			if (stroke.mod && (stroke.meta || stroke.ctrl)) {
				throw new Error(`快捷键 ${binding.commandId} 的同一按键不能同时声明 mod 与 meta/ctrl`)
			}
		}
	}
}

function assertExplicitPrimaryBindings(bindings: readonly Keybinding[]) {
	const groups = buildCommandScopeIndex(bindings)

	for (const [key, group] of groups) {
		const visibleBindings = group.filter((binding) => binding.display !== 'hidden')
		if (visibleBindings.length === 0) {
			continue
		}

		const primaryCount = visibleBindings.filter((binding) => binding.display === 'primary').length
		if (primaryCount !== 1) {
			throw new Error(`快捷键组 ${key} 必须且只能声明一个 primary，当前为 ${primaryCount} 个`)
		}
	}
}

function buildScopeIndex(bindings: readonly Keybinding[]) {
	const index = new Map<KeybindingScope, Keybinding[]>()
	for (const binding of bindings) {
		const group = index.get(binding.scope)
		if (group) {
			group.push(binding)
		} else {
			index.set(binding.scope, [binding])
		}
	}
	return freezeIndex(index)
}

function buildCommandScopeIndex(bindings: readonly Keybinding[]) {
	const index = new Map<string, Keybinding[]>()
	for (const binding of bindings) {
		const key = getCommandScopeKey(binding.commandId, binding.scope)
		const group = index.get(key)
		if (group) {
			group.push(binding)
		} else {
			index.set(key, [binding])
		}
	}
	return freezeIndex(index)
}

function freezeIndex<Key>(index: Map<Key, Keybinding[]>): ReadonlyMap<Key, readonly Keybinding[]> {
	for (const [key, group] of index) {
		index.set(key, Object.freeze(group) as Keybinding[])
	}
	return index
}

function getCommandScopeKey(commandId: CommandId, scope: KeybindingScope) {
	return `${scope}:${commandId}`
}

function findConflicts(bindings: readonly Keybinding[]): KeybindingConflict[] {
	const conflicts: KeybindingConflict[] = []

	for (const platform of SHORTCUT_PLATFORMS) {
		const groups = new Map<string, Keybinding[]>()
		for (const binding of bindings) {
			const key = `${binding.scope}:${normalizeSequence(binding.sequence, platform)}`
			const group = groups.get(key)
			if (group) {
				group.push(binding)
			} else {
				groups.set(key, [binding])
			}
		}

		for (const group of groups.values()) {
			if (group.length < 2) {
				continue
			}
			conflicts.push({
				scope: group[0].scope,
				sequence: group[0].sequence,
				commandIds: group.map((binding) => binding.commandId),
				platforms: [platform],
			})
		}
	}

	return mergeConflictPlatforms(conflicts)
}

function mergeConflictPlatforms(conflicts: readonly KeybindingConflict[]) {
	const merged = new Map<string, KeybindingConflict>()

	for (const conflict of conflicts) {
		const key = `${conflict.scope}:${conflict.commandIds.join('|')}:${normalizeSequence(
			conflict.sequence,
			conflict.platforms[0],
		)}`
		const existing = merged.get(key)
		if (existing) {
			merged.set(key, {
				...existing,
				platforms: [...existing.platforms, ...conflict.platforms],
			})
		} else {
			merged.set(key, conflict)
		}
	}

	return [...merged.values()]
}

function normalizeSequence(sequence: KeybindingSequence, platform: ShortcutPlatform) {
	return sequence.map((stroke) => normalizeStroke(stroke, platform)).join('>')
}

function normalizeStroke(stroke: KeybindingStroke, platform: ShortcutPlatform) {
	const meta = Boolean(stroke.meta || (stroke.mod && platform === 'mac'))
	const ctrl = Boolean(stroke.ctrl || (stroke.mod && platform !== 'mac'))
	const key = stroke.key.length === 1 ? stroke.key.toLowerCase() : stroke.key
	return [key, meta, ctrl, Boolean(stroke.alt), Boolean(stroke.shift)].join(':')
}

function formatConflictMessage(conflicts: readonly KeybindingConflict[]) {
	const details = conflicts
		.map(
			(conflict) =>
				`${conflict.scope}(${conflict.platforms.join('/')}): ${conflict.commandIds.join(', ')}`,
		)
		.join('; ')
	return `检测到同作用域快捷键冲突：${details}`
}
