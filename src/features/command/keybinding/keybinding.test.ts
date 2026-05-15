import { COMMAND_IDS } from '@/features/command/core'
import {
	DEFAULT_KEYBINDINGS,
	KEYBINDING_CHORD_TIMEOUT_MS,
	KeybindingRegistry,
	formatKeybindingSequence,
	matchKeybindingEvent,
	tokenizeKeybindingSequence,
	type Keybinding,
	type KeybindingChordState,
	type NormalizedKeyEvent,
} from '@/features/command/keybinding'

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
		expect(matchCommand('i', chordState, 600)).toBe(COMMAND_IDS.newTaskInInbox)
		expect(matchCommand('p', chordState, 600)).toBe(COMMAND_IDS.newProject)
		expect(matchCommand('v', chordState, 600)).toBe(COMMAND_IDS.newView)
	})

	it('匹配 G 组导航命令', () => {
		const cases = [
			['i', COMMAND_IDS.goInbox],
			['t', COMMAND_IDS.goAllTasks],
			['d', COMMAND_IDS.goToday],
			['u', COMMAND_IDS.goUpcoming],
			['f', COMMAND_IDS.goFocus],
			['v', COMMAND_IDS.goViews],
			['p', COMMAND_IDS.goProjects],
			['a', COMMAND_IDS.goArchive],
			['x', COMMAND_IDS.goTrash],
			['s', COMMAND_IDS.goSettings],
			['r', COMMAND_IDS.goRecent],
		] as const

		for (const [key, commandId] of cases) {
			expect(matchCommand(key, { prefix: { key: 'g' }, scope: 'global', startedAt: 100 }, 200))
				.toBe(commandId)
		}
	})

	it('匹配 O 组打开命令', () => {
		const cases = [
			['t', COMMAND_IDS.openTask],
			['p', COMMAND_IDS.openProject],
			['v', COMMAND_IDS.openView],
			['s', COMMAND_IDS.openSpace],
			['r', COMMAND_IDS.openRecent],
		] as const

		for (const [key, commandId] of cases) {
			expect(matchCommand(key, { prefix: { key: 'o' }, scope: 'global', startedAt: 100 }, 200))
				.toBe(commandId)
		}
	})

	it('格式化 O 组打开命令显示', () => {
		const registry = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

		expect(formatKeybindingSequence(registry.getByCommandId(COMMAND_IDS.openTask)[0].sequence))
			.toBe('O T')
		expect(formatKeybindingSequence(registry.getByCommandId(COMMAND_IDS.openProject)[0].sequence))
			.toBe('O P')
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

	it('检测同 scope 重复绑定', () => {
		const duplicate: Keybinding = {
			commandId: 'test.duplicate',
			sequence: [{ key: 'c' }],
			scope: 'global',
			preventDefault: true,
			allowInEditable: false,
		}

		const registry = new KeybindingRegistry([...DEFAULT_KEYBINDINGS, duplicate])

		expect(registry.detectConflicts()).toEqual([
			{
				scope: 'global',
				sequence: [{ key: 'c' }],
				commandIds: [COMMAND_IDS.newQuickTask, 'test.duplicate'],
			},
		])
	})

	it('格式化平台快捷键显示', () => {
		expect(formatKeybindingSequence([{ key: 'k', meta: true }], { platform: 'mac' }))
			.toBe('⌘K')
		expect(formatKeybindingSequence([{ key: 'k', meta: true }], { platform: 'windows' }))
			.toBe('Ctrl K')
		expect(formatKeybindingSequence([{ key: '/', meta: true }], { platform: 'mac' }))
			.toBe('⌘/')
		expect(formatKeybindingSequence([{ key: '/', ctrl: true }], { platform: 'windows' }))
			.toBe('Ctrl /')
		expect(formatKeybindingSequence([{ key: 'g' }, { key: 'i' }], { platform: 'mac' }))
			.toBe('G I')
	})

	it('将快捷键拆成键帽 token', () => {
		expect(tokenizeKeybindingSequence([{ key: 'k', meta: true }], { platform: 'mac' })).toEqual([
			{ type: 'key', value: '⌘' },
			{ type: 'key', value: 'K' },
		])
		expect(tokenizeKeybindingSequence([{ key: 'g' }, { key: 'i' }], { platform: 'mac' })).toEqual([
			{ type: 'key', value: 'G' },
			{ type: 'separator', value: '→' },
			{ type: 'key', value: 'I' },
		])
	})

	it('支持 Row scope 使用的命名键', () => {
		const bindings: Keybinding[] = [
			{
				commandId: COMMAND_IDS.taskOpenDetail,
				sequence: [{ key: 'Enter' }],
				scope: 'row',
				preventDefault: true,
				allowInEditable: false,
			},
			{
				commandId: COMMAND_IDS.taskDelete,
				sequence: [{ key: 'Delete' }],
				scope: 'row',
				preventDefault: true,
				allowInEditable: false,
			},
			{
				commandId: COMMAND_IDS.taskDelete,
				sequence: [{ key: 'Backspace', meta: true }],
				scope: 'row',
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
})

function matchCommand(
	key: string,
	chordState: KeybindingChordState | null = null,
	now = 100,
	eventOverrides: Partial<NormalizedKeyEvent> = {},
) {
	const result = matchKeybindingEvent({
		bindings: DEFAULT_KEYBINDINGS,
		event: createKeyEvent(key, eventOverrides),
		chordState,
		now,
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
	})

	return result.status === 'matched' ? result.keybinding.commandId : null
}
