import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type ShellThemeContract = {
	main: string
	shell: string
}

function read(repositoryRoot: string, path: string) {
	return readFileSync(resolve(repositoryRoot, path), 'utf8')
}

function requireMatch(source: string, pattern: RegExp, owner: string) {
	const match = source.match(pattern)
	if (!match?.[1]) throw new Error(`${owner} 缺少首帧主题合同`)
	return match[1].toLowerCase()
}

function requireText(source: string, expected: string, owner: string) {
	if (!source.includes(expected)) throw new Error(`${owner} 未同步：${expected}`)
}

function requireBackground(source: string, selector: string, color: string) {
	const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const pattern = new RegExp(`${escapedSelector}\\s*\\{[^}]*background:\\s*${color}\\s*;`, 'is')
	if (!pattern.test(source)) throw new Error(`${selector} 未同步首帧背景：${color}`)
}

export function checkShellThemeSync(repositoryRoot = resolve(import.meta.dir, '..')) {
	const themeCss = read(repositoryRoot, 'src/styles/theme.css')
	const indexHtml = read(repositoryRoot, 'index.html')
	const launcherHtml = read(repositoryRoot, 'launcher.html')
	const mainEntry = read(repositoryRoot, 'src/main.tsx')
	const launcherEntry = read(repositoryRoot, 'src/launcher.tsx')
	const rustWindow = read(repositoryRoot, 'src-tauri/crates/runtime/src/window/main.rs')
	const contract: ShellThemeContract = {
		main: requireMatch(themeCss, /--background:\s*(#[0-9a-f]{6})\b/i, 'theme.css --background'),
		shell: requireMatch(
			themeCss,
			/--surface-secondary:\s*(#[0-9a-f]{6})\b/i,
			'theme.css --surface-secondary',
		),
	}
	requireText(themeCss, '[data-theme="stoneflow-light"]', 'theme.css')
	requireText(themeCss, 'color-scheme: light', 'theme.css')

	for (const [owner, source] of [
		['index.html', indexHtml],
		['launcher.html', launcherHtml],
	] as const) {
		requireText(source, 'class="light" data-theme="stoneflow-light"', owner)
		requireText(source, 'color-scheme: light', owner)
	}

	for (const selector of [
		'#sf-boot-shell',
		'#sf-boot-shell .sf-boot-header',
		'#sf-boot-shell .sf-boot-body',
		'#sf-boot-shell .sf-boot-sidebar',
		'#sf-boot-shell .sf-boot-main',
		'#sf-boot-shell .sf-boot-footer',
	]) {
		requireBackground(indexHtml, selector, contract.shell)
	}
	requireBackground(indexHtml, '#sf-boot-shell .sf-boot-card', contract.main)
	requireText(launcherHtml, 'background: transparent', 'launcher.html')

	for (const [owner, source] of [
		['src/main.tsx', mainEntry],
		['src/launcher.tsx', launcherEntry],
	] as const) {
		requireText(source, "document.documentElement.classList.add('light')", owner)
		requireText(source, "document.documentElement.dataset.theme = 'stoneflow-light'", owner)
	}

	const [red, green, blue] = contract.shell.slice(1).match(/.{2}/g) ?? []
	requireText(
		rustWindow,
		`Color(0x${red}, 0x${green}, 0x${blue}, 0xff)`,
		'src-tauri/crates/runtime/src/window/main.rs',
	)
	requireText(rustWindow, '.background_color(MAIN_WINDOW_SHELL_BG)', 'Rust WebView window')

	return contract
}

if (import.meta.main) {
	const contract = checkShellThemeSync()
	console.log(`首帧主题同步：shell=${contract.shell} main=${contract.main}`)
}
