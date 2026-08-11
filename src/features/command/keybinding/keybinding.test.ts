import { COMMAND_IDS } from '@/features/command/core'
import {
	DEFAULT_KEYBINDINGS,
	KEYBINDING_CHORD_TIMEOUT_MS,
	KeybindingRegistry,
	KeybindingRegistryConflictError,
	matchKeybindingEvent,
	type Keybinding,
	type KeybindingChordState,
	type NormalizedKeyEvent,
} from '@/features/command/keybinding'

const defaultRegistry = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

describe('keybinding', () => {
	it('匹配 C 快速创建任务，并解绑 V 全局创建', () => {
		expect(matchCommand('c')).toBe(COMMAND_IDS.newQuickTask)
		expect(matchCommand('v')).toBeNull()
	})

	it('匹配 N 组创建命令', () => {
		const pending = matchKeybindingEvent({
			bindings: DEFAULT_KEYBINDINGS,
			event: createKeyEvent('n'),
			chordState: null,
			now: 100,
		})
		expect(pending).toMatchObject({ status: 'pending' })

		const chordState = toChordState(pending, 100)
		expect(matchCommand('t', chordState, 600)).toBe(COMMAND_IDS.newFullTask)
		expect(matchCommand('i', chordState, 600)).toBe(COMMAND_IDS.newStandaloneTask)
		expect(matchCommand('p', chordState, 600)).toBe(COMMAND_IDS.newProject)
	})

	it('匹配 G 组导航命令', () => {
		const cases = [
			['i', COMMAND_IDS.goStandalone],
			['t', COMMAND_IDS.goAllTasks],
			['f', COMMAND_IDS.goFocus],
			['v', COMMAND_IDS.goViews],
			['p', COMMAND_IDS.goProjects],
			['a', COMMAND_IDS.goArchive],
			['x', COMMAND_IDS.goTrash],
			['s', COMMAND_IDS.openSettings],
		] as const

		for (const [key, commandId] of cases) {
			expect(
				matchCommand(key, { prefix: { key: 'g' }, scope: 'global', startedAt: 100 }, 200),
			).toBe(commandId)
		}
	})

	it('匹配 O 组打开命令', () => {
		const cases = [
			['t', COMMAND_IDS.openTask],
			['p', COMMAND_IDS.openProject],
		] as const

		for (const [key, commandId] of cases) {
			expect(
				matchCommand(key, { prefix: { key: 'o' }, scope: 'global', startedAt: 100 }, 200),
			).toBe(commandId)
		}
	})

	it('未接入命令不进入默认 Registry，也无法命中 chord', () => {
		const unimplementedCommands = [
			COMMAND_IDS.newView,
			COMMAND_IDS.openView,
			COMMAND_IDS.openSpace,
			COMMAND_IDS.openRecent,
			COMMAND_IDS.goToday,
			COMMAND_IDS.goUpcoming,
			COMMAND_IDS.goRecent,
		]
		for (const commandId of unimplementedCommands) {
			expect(defaultRegistry.resolveAll({ commandId, scope: 'global' })).toEqual([])
		}

		const removedChords = [
			['n', 'v'],
			['o', 'v'],
			['o', 's'],
			['o', 'r'],
			['g', 'd'],
			['g', 'u'],
			['g', 'r'],
		] as const
		for (const [prefix, key] of removedChords) {
			const result = matchKeybindingEvent({
				bindings: DEFAULT_KEYBINDINGS,
				event: createKeyEvent(key),
				chordState: { prefix: { key: prefix }, scope: 'global', startedAt: 100 },
				now: 200,
			})
			expect(result).toEqual({ status: 'cancelled' })
		}
	})

	it('O 组打开命令保留声明的 chord', () => {
		const registry = new KeybindingRegistry(DEFAULT_KEYBINDINGS)
		const openTask = registry.resolvePrimary({
			commandId: COMMAND_IDS.openTask,
			scope: 'global',
		})
		const openProject = registry.resolvePrimary({
			commandId: COMMAND_IDS.openProject,
			scope: 'global',
		})

		expect(openTask?.sequence).toEqual([{ key: 'o' }, { key: 't' }])
		expect(openProject?.sequence).toEqual([{ key: 'o' }, { key: 'p' }])
	})

	it('非法第二键取消 chord', () => {
		const result = matchKeybindingEvent({
			bindings: DEFAULT_KEYBINDINGS,
			event: createKeyEvent('z'),
			chordState: { prefix: { key: 'g' }, scope: 'global', startedAt: 100 },
			now: 200,
		})

		expect(result).toEqual({ status: 'cancelled' })
	})

	it('超时后取消 chord', () => {
		const result = matchKeybindingEvent({
			bindings: DEFAULT_KEYBINDINGS,
			event: createKeyEvent('p'),
			chordState: { prefix: { key: 'n' }, scope: 'global', startedAt: 100 },
			now: 100 + KEYBINDING_CHORD_TIMEOUT_MS + 1,
		})

		expect(result).toEqual({ status: 'cancelled' })
	})

	it('输入态普通键不触发，但 Cmd/Ctrl+K 可以触发', () => {
		if (typeof document === 'undefined') {
			return
		}

		const input = document.createElement('input')
		document.body.appendChild(input)

		expect(matchCommand('c', null, 100, { target: input })).toBeNull()
		expect(matchCommand('k', null, 100, { metaKey: true, target: input })).toBe(
			COMMAND_IDS.openCommandMenu,
		)
		expect(matchCommand('k', null, 100, { ctrlKey: true, target: input })).toBe(
			COMMAND_IDS.openCommandMenu,
		)

		document.body.removeChild(input)
	})

	it('IME composing 时不触发', () => {
		expect(matchCommand('c', null, 100, { isComposing: true })).toBeNull()
	})

	it('构造时拒绝同 scope 的规范化重复绑定', () => {
		const duplicate: Keybinding = {
			commandId: 'test.duplicate',
			sequence: [{ key: 'c' }],
			scope: 'global',
			display: 'primary',
			preventDefault: true,
			allowInEditable: false,
		}

		expect(() => new KeybindingRegistry([...DEFAULT_KEYBINDINGS, duplicate])).toThrow(
			KeybindingRegistryConflictError,
		)
	})

	it('冲突检测会按平台展开 mod 语义', () => {
		const modBinding = createTestBinding('test.mod', 'global', [{ key: 'k', mod: true }])
		const macMetaBinding = createTestBinding('test.meta', 'global', [{ key: 'k', meta: true }])

		expect(() => new KeybindingRegistry([modBinding, macMetaBinding])).toThrow(
			KeybindingRegistryConflictError,
		)
	})

	it('允许不同 scope 复用同一按键', () => {
		const registry = new KeybindingRegistry([
			createTestBinding('test.global', 'global', [{ key: 'c' }]),
			createTestBinding('test.row', 'row', [{ key: 'c' }]),
		])

		expect(registry.getByScope('global')).toHaveLength(1)
		expect(registry.getByScope('row')).toHaveLength(1)
	})

	it('primary / all 解析不依赖声明顺序', () => {
		const primary = defaultRegistry.resolvePrimary({
			commandId: COMMAND_IDS.openSettings,
			scope: 'global',
		})
		const all = defaultRegistry.resolveAll({
			commandId: COMMAND_IDS.openSettings,
			scope: 'global',
		})

		expect(primary?.sequence).toEqual([{ key: ',', mod: true }])
		expect(all.map((binding) => binding.sequence)).toEqual([
			[{ key: ',', mod: true }],
			[{ key: 'g' }, { key: 's' }],
		])
	})

	it('hidden 绑定可执行，但不会解析成可展示快捷键', () => {
		const runtimeOnlyBinding: Keybinding = {
			...createTestBinding('test.runtimeOnly', 'global', [{ key: 'h' }]),
			display: 'hidden',
		}
		const registry = new KeybindingRegistry([runtimeOnlyBinding])

		expect(
			registry.resolvePrimary({
				commandId: runtimeOnlyBinding.commandId,
				scope: 'global',
			}),
		).toBeNull()
		expect(
			matchKeybindingEvent({
				bindings: registry.getAll(),
				event: createKeyEvent('h'),
				chordState: null,
				now: 100,
			}),
		).toMatchObject({ status: 'matched', keybinding: runtimeOnlyBinding })
	})

	it('拒绝没有 primary 的可展示快捷键组', () => {
		expect(
			() =>
				new KeybindingRegistry([
					{
						...createTestBinding('test.alternative', 'global', [{ key: 'a' }]),
						display: 'alternative',
					},
				]),
		).toThrow('必须且只能声明一个 primary')
	})

	it('mod 在各平台映射到对应的物理修饰键', () => {
		expect(matchCommand('k', null, 100, { metaKey: true }, 'mac')).toBe(COMMAND_IDS.openCommandMenu)
		expect(matchCommand('k', null, 100, { ctrlKey: true }, 'windows')).toBe(
			COMMAND_IDS.openCommandMenu,
		)
		expect(matchCommand('k', null, 100, { ctrlKey: true }, 'mac')).toBeNull()
	})

	it('支持 Row scope 使用的命名键', () => {
		const bindings: Keybinding[] = [
			{
				commandId: COMMAND_IDS.taskOpenDetail,
				sequence: [{ key: 'Enter' }],
				scope: 'row',
				display: 'primary',
				preventDefault: true,
				allowInEditable: false,
			},
			{
				commandId: COMMAND_IDS.taskDelete,
				sequence: [{ key: 'Delete' }],
				scope: 'row',
				display: 'primary',
				preventDefault: true,
				allowInEditable: false,
			},
			{
				commandId: COMMAND_IDS.taskDelete,
				sequence: [{ key: 'Backspace', mod: true }],
				scope: 'row',
				display: 'alternative',
				preventDefault: true,
				allowInEditable: false,
			},
		]

		expect(matchScopedCommand(bindings, 'Enter')).toBe(COMMAND_IDS.taskOpenDetail)
		expect(matchScopedCommand(bindings, 'Delete')).toBe(COMMAND_IDS.taskDelete)
		expect(matchScopedCommand(bindings, 'Backspace', { metaKey: true })).toBe(
			COMMAND_IDS.taskDelete,
		)
	})

	it('支持 [ / ] / Escape / 提交快捷键 / Ctrl+[ / Ctrl+] / F 筛选 / Shift+F 显示', () => {
		expect(matchCommand('[')).toBe(COMMAND_IDS.layoutToggleSidebar)
		expect(matchCommand(']')).toBe(COMMAND_IDS.layoutTogglePreview)
		expect(matchCommand('Escape')).toBe(COMMAND_IDS.close)
		expect(matchCommand('Backspace', null, 100, { metaKey: true })).toBe(
			COMMAND_IDS.selectionDeleteByRoute,
		)
		expect(matchCommand('Backspace', null, 100, { ctrlKey: true })).toBe(
			COMMAND_IDS.selectionDeleteByRoute,
		)
		expect(matchCommand('Enter', null, 100, { metaKey: true })).toBe(COMMAND_IDS.saveOrSubmit)
		expect(matchCommand('Enter', null, 100, { metaKey: true, shiftKey: true })).toBe(
			COMMAND_IDS.submitAndContinue,
		)
		expect(matchCommand('Enter', null, 100, { metaKey: true, altKey: true })).toBe(
			COMMAND_IDS.submitAndOpen,
		)
		expect(matchCommand('[', null, 100, { ctrlKey: true })).toBe(COMMAND_IDS.goBack)
		expect(matchCommand(']', null, 100, { ctrlKey: true })).toBe(COMMAND_IDS.goForward)

		// Linear：F 直接开筛选，Shift+F 开显示；无 F 二次 chord
		expect(matchCommand('f')).toBe(COMMAND_IDS.filterAdd)
		expect(matchCommand('f', null, 100, { shiftKey: true })).toBe(COMMAND_IDS.displayOpenOptions)
	})
})

function matchCommand(
	key: string,
	chordState: KeybindingChordState | null = null,
	now = 100,
	eventOverrides: Partial<NormalizedKeyEvent> = {},
	platform: 'mac' | 'windows' | 'linux' = eventOverrides.ctrlKey ? 'windows' : 'mac',
) {
	const result = matchKeybindingEvent({
		bindings: DEFAULT_KEYBINDINGS,
		event: createKeyEvent(key, eventOverrides),
		chordState,
		now,
		platform,
	})

	return result.status === 'matched' ? result.keybinding.commandId : null
}

function createKeyEvent(
	key: string,
	overrides: Partial<NormalizedKeyEvent> = {},
): NormalizedKeyEvent {
	return {
		key,
		metaKey: false,
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		defaultPrevented: false,
		isComposing: false,
		target: null,
		...overrides,
	}
}

function toChordState(
	result: ReturnType<typeof matchKeybindingEvent>,
	startedAt: number,
): KeybindingChordState {
	if (result.status !== 'pending') {
		throw new Error('expected pending keybinding result')
	}

	return {
		prefix: result.prefix,
		scope: result.scope,
		startedAt,
	}
}

function matchScopedCommand(
	bindings: Keybinding[],
	key: string,
	eventOverrides: Partial<NormalizedKeyEvent> = {},
) {
	const result = matchKeybindingEvent({
		bindings,
		event: createKeyEvent(key, eventOverrides),
		scope: 'row',
		chordState: null,
		now: 100,
		platform: eventOverrides.ctrlKey ? 'windows' : 'mac',
	})

	return result.status === 'matched' ? result.keybinding.commandId : null
}

function createTestBinding(
	commandId: string,
	scope: Keybinding['scope'],
	sequence: Keybinding['sequence'],
): Keybinding {
	return {
		commandId,
		scope,
		sequence,
		display: 'primary',
		preventDefault: false,
		allowInEditable: false,
	}
}
