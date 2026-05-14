import { COMMAND_IDS } from '@/features/command/core'
import {
	DEFAULT_KEYBINDINGS,
	KEYBINDING_CHORD_TIMEOUT_MS,
	KeybindingRegistry,
	formatKeybindingSequence,
	matchKeybindingEvent,
	type Keybinding,
	type KeybindingChordState,
	type NormalizedKeyEvent,
} from '@/features/command/keybinding'

describe('keybinding', () => {
	it('匹配 C / V 单键命令', () => {
		expect(matchCommand('c')).toBe(COMMAND_IDS.newTask)
		expect(matchCommand('v')).toBe(COMMAND_IDS.newTaskFullscreen)
	})

	it('匹配 N P 前缀命令', () => {
		const pending = matchKeybindingEvent({
			bindings: DEFAULT_KEYBINDINGS,
			event: createKeyEvent('n'),
			chordState: null,
			now: 100,
		})
		expect(pending).toMatchObject({ status: 'pending' })

		const chordState = toChordState(pending, 100)
		expect(matchCommand('p', chordState, 600)).toBe(COMMAND_IDS.newProject)
	})

	it('匹配 G 组导航命令', () => {
		const cases = [
			['i', COMMAND_IDS.goInbox],
			['t', COMMAND_IDS.goAllTasks],
			['v', COMMAND_IDS.goViews],
			['p', COMMAND_IDS.goProjects],
			['a', COMMAND_IDS.goArchive],
			['x', COMMAND_IDS.goTrash],
			['s', COMMAND_IDS.goSettings],
		] as const

		for (const [key, commandId] of cases) {
			expect(matchCommand(key, { prefix: { key: 'g' }, scope: 'global', startedAt: 100 }, 200))
				.toBe(commandId)
		}
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
				commandIds: [COMMAND_IDS.newTask, 'test.duplicate'],
			},
		])
	})

	it('格式化平台快捷键显示', () => {
		expect(formatKeybindingSequence([{ key: 'k', meta: true }], { platform: 'mac' }))
			.toBe('⌘K')
		expect(formatKeybindingSequence([{ key: 'k', meta: true }], { platform: 'windows' }))
			.toBe('Ctrl K')
		expect(formatKeybindingSequence([{ key: 'g' }, { key: 'i' }], { platform: 'mac' }))
			.toBe('G I')
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
		target: document.body,
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
