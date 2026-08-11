/**
 * 快捷键展示平台。
 */
export type ShortcutPlatform = 'mac' | 'windows' | 'linux'

/**
 * 与业务命令无关的物理按键组合。
 *
 * `mod` 表示平台主修饰键：macOS 为 Command，Windows / Linux 为 Control。
 */
export type ShortcutStroke = {
	key: string
	mod?: boolean
	meta?: boolean
	ctrl?: boolean
	alt?: boolean
	shift?: boolean
}

/**
 * 快捷键展示 token；key 为同时按键，separator 为 chord 顺序分隔。
 */
export type ShortcutToken = {
	type: 'key' | 'separator'
	value: string
}

const arrowKeyLabels: Readonly<Record<string, string>> = {
	ArrowDown: '↓',
	ArrowLeft: '←',
	ArrowRight: '→',
	ArrowUp: '↑',
}

const accessibleKeyLabels: Readonly<Record<string, string>> = {
	'⌘': 'Command',
	'⌃': 'Control',
	'⌥': 'Option',
	'⇧': 'Shift',
	'⌫': 'Delete',
	'⌦': '向前删除',
	'↑': '上方向键',
	'↓': '下方向键',
	'←': '左方向键',
	'→': '右方向键',
	Ctrl: 'Control',
	Esc: 'Escape',
	Space: '空格',
	Win: 'Windows',
}

/**
 * 将快捷键序列投影为平台化键帽 token。
 *
 * 同一按键组合拆成连续 key token，chord 则在两段之间插入 separator。
 */
export function tokenizeShortcutSequence(
	sequence: readonly ShortcutStroke[],
	platform: ShortcutPlatform = inferShortcutPlatform(),
): ShortcutToken[] {
	return sequence.flatMap<ShortcutToken>((stroke, index) => {
		const strokeTokens = tokenizeShortcutStroke(stroke, platform)
		return index === 0 ? strokeTokens : [{ type: 'separator', value: '→' }, ...strokeTokens]
	})
}

/**
 * 将单次按键组合投影为当前平台的视觉键帽。
 *
 * macOS 使用原生修饰键符号和系统顺序；Windows / Linux 使用键盘文字。
 */
export function tokenizeShortcutStroke(
	stroke: ShortcutStroke,
	platform: ShortcutPlatform = inferShortcutPlatform(),
): ShortcutToken[] {
	return [...getModifierLabels(stroke, platform), getKeyLabel(stroke.key, platform)].map(
		(value) => ({ type: 'key', value }),
	)
}

/**
 * 将视觉键帽转换为稳定的读屏文案。
 *
 * separator 表示依次输入；同一段中的键表示同时按下。
 */
export function getShortcutAccessibilityLabel(tokens: readonly ShortcutToken[]) {
	const strokes: string[][] = [[]]
	for (const token of tokens) {
		if (token.type === 'separator') {
			strokes.push([])
			continue
		}
		strokes.at(-1)?.push(accessibleKeyLabels[token.value] ?? token.value)
	}

	const labels = strokes.filter((stroke) => stroke.length > 0).map((stroke) => stroke.join(' + '))
	if (labels.length === 0) {
		return ''
	}
	return labels.length === 1 ? `按 ${labels[0]}` : `依次按 ${labels.join('、')}`
}

/**
 * 根据当前 WebView 的用户代理判断快捷键展示平台。
 */
export function inferShortcutPlatform(): ShortcutPlatform {
	if (typeof navigator === 'undefined') {
		return 'mac'
	}

	if (/Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
		return 'mac'
	}

	if (/Windows/i.test(navigator.userAgent)) {
		return 'windows'
	}

	return 'linux'
}

function getModifierLabels(stroke: ShortcutStroke, platform: ShortcutPlatform) {
	if (platform === 'mac') {
		return [
			stroke.ctrl ? '⌃' : null,
			stroke.alt ? '⌥' : null,
			stroke.shift ? '⇧' : null,
			stroke.mod || stroke.meta ? '⌘' : null,
		].filter((label): label is string => label !== null)
	}

	return [
		stroke.meta ? (platform === 'windows' ? 'Win' : 'Meta') : null,
		stroke.mod || stroke.ctrl ? 'Ctrl' : null,
		stroke.alt ? 'Alt' : null,
		stroke.shift ? 'Shift' : null,
	].filter((label): label is string => label !== null)
}

function getKeyLabel(key: string, platform: ShortcutPlatform) {
	if (key === 'Escape') {
		return 'Esc'
	}

	if (key === 'Backspace') {
		return platform === 'mac' ? '⌫' : 'Backspace'
	}

	if (key === 'Delete') {
		return platform === 'mac' ? '⌦' : 'Delete'
	}

	if (key in arrowKeyLabels) {
		return arrowKeyLabels[key]
	}

	return key.length === 1 ? key.toUpperCase() : key
}
