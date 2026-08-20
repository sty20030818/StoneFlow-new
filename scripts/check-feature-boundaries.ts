/** Feature public-surface 与 HeroUI 视觉所有权门禁。 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const FEATURES = [
	'appearance',
	'task',
	'selection',
	'submit',
	'filter',
	'danger-confirm',
	'project',
	'space',
	'view',
	'lifecycle',
	'command',
	'settings',
	'entity-detail',
	'metadata-fields',
	'display-options',
	'bulk-action',
	'sync',
	'launcher',
	'global-search',
	'changelog',
	'update',
	'workspace',
	'activity',
	'project-overview',
	'shell-dialogs',
] as const

const STABLE_SUFFIXES = ['contract', 'page', 'presentation', 'shortcut-contribution'] as const
const REPOSITORY_ROOT = join(import.meta.dir, '..')
const transpiler = new Bun.Transpiler({ loader: 'tsx' })

export type BoundarySource = { path: string; source: string }
export type BoundaryRuleId =
	| 'feature-deep-import'
	| 'legacy-visual-import'
	| 'legacy-visual-style'
	| 'parallel-visual-import'
	| 'heroui-important-style'
	| 'heroui-state-style'
	| 'heroui-skin-style'
	| 'heroui-internal-metric'

export type BoundaryViolation = {
	path: string
	line: number
	ruleId: BoundaryRuleId
	excerpt: string
	detail: string
	feature?: string
	tag?: string
	token?: string
}

type ImportReference = { path: string; start: number; dynamic?: boolean }
type StaticFragment = { value: string; start: number }

function walkBoundaryFiles(dir: string): string[] {
	const files: string[] = []
	for (const name of readdirSync(dir)) {
		const full = join(dir, name)
		const stat = statSync(full)
		if (stat.isDirectory()) {
			if (name !== 'node_modules' && name !== 'dist') files.push(...walkBoundaryFiles(full))
		} else if (/\.(?:css|ts|tsx)$/.test(name)) files.push(full)
	}
	return files
}

function normalizePath(path: string) {
	return path.replaceAll('\\', '/')
}

function pathInsideSrc(path: string) {
	const normalized = normalizePath(path)
	const srcIndex = normalized.lastIndexOf('/src/')
	return srcIndex >= 0
		? normalized.slice(srcIndex + 5)
		: normalized.startsWith('src/')
			? normalized.slice(4)
			: normalized
}

function isInsideFeature(path: string, feature: string) {
	const pathInSrc = pathInsideSrc(path)
	return pathInSrc === `features/${feature}` || pathInSrc.startsWith(`features/${feature}/`)
}

function isLegalFeatureImportPath(feature: string, importPath: string) {
	const base = `@/features/${feature}`
	return importPath === base || STABLE_SUFFIXES.some((suffix) => importPath === `${base}/${suffix}`)
}

function isProductionSource(path: string) {
	return (
		!/(^|\/)(?:__tests__|test)(?:\/|$)/.test(path) && !/\.(?:test|spec|stories)\.[^/]+$/.test(path)
	)
}

function lineNumber(source: string, index: number) {
	return source.slice(0, index).split('\n').length
}

function excerptAt(source: string, index: number) {
	const start = source.lastIndexOf('\n', index - 1) + 1
	const end = source.indexOf('\n', index)
	const excerpt = source.slice(start, end < 0 ? source.length : end).trim()
	return excerpt.length > 180 ? `${excerpt.slice(0, 177)}...` : excerpt
}

function moduleLiteralStart(source: string, modulePath: string, from = 0) {
	const single = source.indexOf(`'${modulePath}'`, from)
	const double = source.indexOf(`"${modulePath}"`, from)
	if (single < 0) return double < 0 ? 0 : double
	if (double < 0) return single
	return Math.min(single, double)
}

function scanImports(source: string): ImportReference[] {
	let cursor = 0
	return transpiler
		.scan(source)
		.imports.filter((item) => item.kind === 'import-statement' || item.kind === 'dynamic-import')
		.map((item) => {
			const start = moduleLiteralStart(source, item.path, cursor)
			cursor = start + item.path.length
			return { path: item.path, start, dynamic: item.kind === 'dynamic-import' }
		})
}

function collectHeroUIBindings(source: string, imports: readonly ImportReference[]) {
	const paths = new Set(
		imports
			.map((item) => item.path)
			.filter((path) => /^@heroui(?:-pro)?\/react(?:\/[^'"]+)?$/.test(path)),
	)
	const bindings = new Map<string, string>()
	for (const match of source.matchAll(
		/\bimport\s*{([^}]*)}\s*from\s*(['"])(@heroui(?:-pro)?\/react(?:\/[^'"]+)?)\2/g,
	)) {
		if (!paths.has(match[3])) continue
		for (const raw of match[1].split(',')) {
			const specifier = raw.trim().replace(/^type\s+/, '')
			const parsed = specifier.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/)
			if (parsed) bindings.set(parsed[2] ?? parsed[1], parsed[1])
		}
	}
	return bindings
}

function readQuotedEnd(source: string, start: number) {
	const quote = source[start]
	let index = start + 1
	while (index < source.length) {
		if (source[index] === '\\') index += 2
		else if (source[index] === quote) return index + 1
		else index += 1
	}
	return source.length
}

function readBalancedEnd(source: string, start: number) {
	let depth = 0
	for (let index = start; index < source.length; index += 1) {
		if (/['"`]/.test(source[index])) {
			index = readQuotedEnd(source, index) - 1
			continue
		}
		if (source[index] === '{') depth += 1
		else if (source[index] === '}' && --depth === 0) return index + 1
	}
	return source.length
}

function findOpeningTagEnd(source: string, start: number) {
	let braces = 0
	for (let index = start; index < source.length; index += 1) {
		if (/['"`]/.test(source[index])) {
			index = readQuotedEnd(source, index) - 1
			continue
		}
		if (source[index] === '{') braces += 1
		else if (source[index] === '}') braces = Math.max(0, braces - 1)
		else if (source[index] === '>' && braces === 0) return index
	}
	return -1
}

function quotedFragments(source: string, start: number, end: number) {
	const fragments: StaticFragment[] = []
	for (let index = start; index < end; index += 1) {
		if (!/['"`]/.test(source[index])) continue
		const valueEnd = readQuotedEnd(source, index)
		fragments.push({ value: source.slice(index + 1, valueEnd - 1), start: index + 1 })
		index = valueEnd - 1
	}
	return fragments
}

function collectClassFragments(source: string, start: number, end: number) {
	const fragments: StaticFragment[] = []
	for (let index = start; index < end; index += 1) {
		if (/['"`]/.test(source[index])) {
			index = readQuotedEnd(source, index) - 1
			continue
		}
		if (source[index] === '{') {
			index = readBalancedEnd(source, index) - 1
			continue
		}
		const match = source.slice(index, end).match(/^classNames?\s*=\s*/)
		if (!match || (index > start && /[\w$]/.test(source[index - 1]))) continue
		const valueStart = index + match[0].length
		const character = source[valueStart]
		if (/['"`]/.test(character)) {
			const valueEnd = readQuotedEnd(source, valueStart)
			fragments.push({ value: source.slice(valueStart + 1, valueEnd - 1), start: valueStart + 1 })
			index = valueEnd - 1
		} else if (character === '{') {
			const valueEnd = readBalancedEnd(source, valueStart)
			fragments.push(...quotedFragments(source, valueStart + 1, valueEnd - 1))
			index = valueEnd - 1
		}
	}
	return fragments
}

function splitUtility(token: string) {
	let squareDepth = 0
	let parenthesisDepth = 0
	let lastColon = -1
	for (let index = 0; index < token.length; index += 1) {
		if (token[index] === '[') squareDepth += 1
		else if (token[index] === ']') squareDepth -= 1
		else if (token[index] === '(') parenthesisDepth += 1
		else if (token[index] === ')') parenthesisDepth -= 1
		else if (token[index] === ':' && squareDepth === 0 && parenthesisDepth === 0) lastColon = index
	}
	const modifierText = lastColon < 0 ? '' : token.slice(0, lastColon)
	return {
		modifiers: modifierText ? modifierText.split(':') : [],
		base: token
			.slice(lastColon + 1)
			.replace(/^!/, '')
			.replace(/^-/, '')
			.replace(/!$/, ''),
	}
}

function isInteractionModifier(modifier: string) {
	const state =
		'(?:hovered|pressed|selected|open|focused|focus-visible|disabled|invalid|expanded|checked|indeterminate|pending|current)'
	return (
		/^(?:(?:group|peer)-)?(?:hover|active|focus(?:-visible|-within)?|disabled|checked|indeterminate|selected|open|pressed|expanded|invalid|read-only)(?:\/[\w-]+)?$/.test(
			modifier,
		) || new RegExp(`^(?:aria|data|group-data|peer-data)-.*${state}`).test(modifier)
	)
}

function isTextColor(base: string) {
	return (
		base.startsWith('text-') &&
		!/^text-(?:xs|sm|base|lg|xl|[2-9]xl|\[.*(?:px|rem|em|ch|lh|clamp|calc).*)$/.test(base) &&
		!/^text-(?:left|right|center|justify|start|end|ellipsis|clip)$/.test(base)
	)
}

function isSkinUtility(base: string) {
	if (base.startsWith('opacity-')) return true
	return (
		isTextColor(base) ||
		/^(?:bg-|border(?:-|$)|divide-|rounded(?:-|$)|shadow(?:-|$)|ring(?:-|$)|outline(?:-|$)|fill-|stroke-|decoration-|accent-|caret-|placeholder-|backdrop-|drop-shadow-|from-|via-|to-|\[(?:color|background|border|box-shadow|border-radius|outline|text-shadow):)/.test(
			base,
		)
	)
}

function isInternalMetric(
	tag: string,
	base: string,
	opening: string,
	modifiers: readonly string[],
) {
	const typeMetric =
		/^(?:font-|leading-|tracking-|text-(?:xs|sm|base|lg|xl|[2-9]xl|\[)|uppercase|lowercase|normal-case|tabular-nums|lining-nums)/.test(
			base,
		)
	const layoutMetric =
		/^(?:block$|inline-block$|flex$|inline-flex$|grid$|inline-grid$|flex-(?:row|col|wrap|nowrap)|items-|justify-|content-|place-|grid-(?:cols|rows|flow)|gap-|space-[xy]-|p[trblxyse]?-)/.test(
			base,
		)
	const heightMetric = /^(?:size-|h-|min-h-|max-h-)/.test(base)
	const descendantMetric =
		modifiers.some((modifier) => modifier.startsWith('[&')) &&
		/^(?:size-|h-|w-|m[trblxyse]?-|p[trblxyse]?-|gap-|font-|leading-|tracking-|text-)/.test(base)
	if (descendantMetric) return true

	const atomic =
		/^(?:Button|ToggleButton|Input|SearchField\.Group|Select\.Trigger|Checkbox|Switch|Radio)$/
	const denseItem = /^(?:(?:Dropdown|ContextMenu|ListBox|Command)\.Item|ListView\.Item)$/
	const chrome =
		/^(?:(?:Modal|AlertDialog)\.(?:Dialog|Header|Body|Footer)|Sheet\.Dialog|Popover\.(?:Content|Dialog)|Tooltip\.Content|Card(?:\.(?:Header|Content|Footer))?|Command\.(?:Header|Footer|Group)|Sidebar\.(?:Header|Content|Footer)|Disclosure\.(?:Trigger|Indicator)|SearchField\.(?:SearchIcon|ClearButton)|Radio\.(?:Content|Control|Indicator)|ListView(?:\.(?:ItemContent|ItemAction))?|Breadcrumbs)$/
	const iconMetric =
		/^(?:SearchField\.(?:SearchIcon|ClearButton)|Disclosure\.Indicator|Radio\.(?:Control|Indicator))$/

	if (atomic.test(tag)) {
		const contentHeight =
			tag === 'Button' &&
			/\bdata-content-height\s*=\s*(?:['"]true['"]|\{\s*true\s*\})/.test(opening)
		return layoutMetric || typeMetric || (heightMetric && !contentHeight)
	}
	if (tag === 'TextArea') return layoutMetric || typeMetric
	if (denseItem.test(tag)) return layoutMetric || typeMetric || heightMetric
	if (tag === 'ListView.ItemAction') {
		return typeMetric || /^(?:items-|justify-|gap-|p[trblxyse]?-)/.test(base)
	}
	if (chrome.test(tag)) return layoutMetric || typeMetric || (iconMetric.test(tag) && heightMetric)
	if (tag === 'Avatar') return /^(?:size-|h-|w-)/.test(base)
	if (tag === 'Chip') return layoutMetric || typeMetric || heightMetric
	return false
}

function classifyHeroUIUtility(
	file: BoundarySource,
	tag: string,
	token: string,
	opening: string,
): BoundaryRuleId | null {
	const { modifiers, base } = splitUtility(token)
	const interaction = modifiers.some(isInteractionModifier)
	const launcherVisibility =
		file.path === 'src/features/launcher/chrome/LauncherSurface.tsx' &&
		tag === 'Surface' &&
		/\bdata-native-window-surface\s*=/.test(opening) &&
		modifiers.length === 0 &&
		/^opacity-(?:0|100)$/.test(base)
	const skin = !launcherVisibility && isSkinUtility(base)
	const metric = isInternalMetric(tag, base, opening, modifiers)
	if (token.startsWith('!') || token.endsWith('!') || /(^|:)!/.test(token)) {
		return 'heroui-important-style'
	}
	if (interaction && (skin || metric || /^(?:scale-|rotate-)/.test(base))) {
		return 'heroui-state-style'
	}
	if (skin) return 'heroui-skin-style'
	if (metric) return 'heroui-internal-metric'
	return null
}

// ponytail: 只解析当前仓库真实使用的 named imports 与静态 class literals；代码字符串或动态视觉拼装出现时升级为 AST lint rule。
function scanHeroUIStyles(file: BoundarySource, bindings: ReadonlyMap<string, string>) {
	const violations: BoundaryViolation[] = []
	for (const match of file.source.matchAll(/<([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\b/g)) {
		const [root, ...parts] = match[1].split('.')
		const imported = bindings.get(root)
		if (!imported) continue
		const openingStart = match.index ?? 0
		const openingEnd = findOpeningTagEnd(file.source, openingStart + match[0].length)
		if (openingEnd < 0) continue
		const tag = [imported, ...parts].join('.')
		const opening = file.source.slice(openingStart, openingEnd + 1)
		for (const fragment of collectClassFragments(file.source, openingStart, openingEnd)) {
			for (const tokenMatch of fragment.value.matchAll(/\S+/g)) {
				const token = tokenMatch[0]
				const start = fragment.start + (tokenMatch.index ?? 0)
				const ruleId = classifyHeroUIUtility(file, tag, token, opening)
				if (!ruleId) continue
				violations.push({
					path: file.path,
					line: lineNumber(file.source, start),
					ruleId,
					excerpt: excerptAt(file.source, start),
					detail: `${tag} 的 ${token}`,
					tag,
					token,
				})
			}
		}
	}
	return violations
}

function classifyVisualImport(modulePath: string): BoundaryRuleId | null {
	if (
		/^@\/shared\/components\/(?:base|detail|main-card|patterns)(?:\/|$)/.test(modulePath) ||
		/^@\/styles\/(?:tokens|adapters|dark)(?:\/|$)/.test(modulePath)
	) {
		return 'legacy-visual-import'
	}
	if (
		modulePath === '@heroui/styles' ||
		modulePath === 'class-variance-authority' ||
		modulePath === 'tailwind-variants' ||
		/^@\/styles(?:\/|$)/.test(modulePath) ||
		/^@heroui(?:-pro)?\/react\/(?:css|.*\.css)$/.test(modulePath)
	) {
		return 'parallel-visual-import'
	}
	return null
}

function scanLegacyVisualStyles(file: BoundarySource) {
	const violations: BoundaryViolation[] = []
	const legacyStyle =
		/var\(\s*--(?:sf|legacy)-[\w-]+\s*\)|--(?:sf|legacy)-[\w-]+\s*:|\bdark:[^\s'"`}]+|\b(?:bg|text|border|ring|shadow|fill|stroke)-(?:sf-[\w-]+|legacy-[\w-]+|card(?:-foreground)?|popover(?:-foreground)?|destructive(?:-foreground)?|muted-foreground|input|ring|sidebar(?:-[\w-]+)?)(?:\/[\w.]+)?/g
	for (const match of file.source.matchAll(legacyStyle)) {
		const start = match.index ?? 0
		violations.push({
			path: file.path,
			line: lineNumber(file.source, start),
			ruleId: 'legacy-visual-style',
			excerpt: excerptAt(file.source, start),
			detail: match[0],
			token: match[0],
		})
	}
	return violations
}

function scanFeatureImports(file: BoundarySource, imports: readonly ImportReference[]) {
	const references = imports.filter((item) => !item.dynamic)
	for (const match of file.source.matchAll(/vi\.mock\(\s*['"](@\/features\/[^'"]+)['"]/g)) {
		references.push({ path: match[1], start: match.index ?? 0 })
	}
	const violations: BoundaryViolation[] = []
	for (const reference of references) {
		for (const feature of FEATURES) {
			const prefix = `@/features/${feature}`
			if (
				(reference.path === prefix || reference.path.startsWith(`${prefix}/`)) &&
				!isInsideFeature(file.path, feature) &&
				!isLegalFeatureImportPath(feature, reference.path)
			) {
				violations.push({
					path: file.path,
					feature,
					line: lineNumber(file.source, reference.start),
					ruleId: 'feature-deep-import',
					excerpt: excerptAt(file.source, reference.start),
					detail: reference.path,
				})
			}
		}
	}
	return violations
}

export function scanFeatureBoundarySources(sources: readonly BoundarySource[]) {
	const violations: BoundaryViolation[] = []
	for (const file of sources) {
		if (isProductionSource(file.path)) violations.push(...scanLegacyVisualStyles(file))
		if (file.path.endsWith('.css')) continue

		const imports = scanImports(file.source)
		violations.push(...scanFeatureImports(file, imports))
		if (!isProductionSource(file.path)) continue

		for (const reference of imports) {
			const ruleId = classifyVisualImport(reference.path)
			if (
				!ruleId ||
				(ruleId === 'parallel-visual-import' &&
					!/^src\/(?:features|layout|routes)\//.test(file.path))
			)
				continue
			violations.push({
				path: file.path,
				line: lineNumber(file.source, reference.start),
				ruleId,
				excerpt: excerptAt(file.source, reference.start),
				detail: reference.path,
			})
		}

		if (file.path.endsWith('.tsx')) {
			violations.push(...scanHeroUIStyles(file, collectHeroUIBindings(file.source, imports)))
		}
	}

	const seen = new Set<string>()
	return violations.filter((violation) => {
		const key = `${violation.path}:${violation.line}:${violation.ruleId}:${violation.detail}`
		if (seen.has(key)) return false
		seen.add(key)
		return true
	})
}

export function scanFeatureBoundaries(repositoryRoot = REPOSITORY_ROOT) {
	return scanFeatureBoundarySources(
		walkBoundaryFiles(join(repositoryRoot, 'src')).map((file) => ({
			path: normalizePath(relative(repositoryRoot, file)),
			source: readFileSync(file, 'utf8'),
		})),
	)
}

export function formatBoundaryViolations(violations: readonly BoundaryViolation[]) {
	return violations
		.map((violation) => {
			const detail =
				violation.ruleId === 'feature-deep-import' && violation.feature
					? `合法入口: @/features/${violation.feature} | …/contract | …/page | …/presentation | …/shortcut-contribution`
					: violation.detail
			return `${violation.path}:${violation.line} [${violation.ruleId}] ${violation.excerpt}\n  → ${detail}`
		})
		.join('\n')
}

if (import.meta.main) {
	const violations = scanFeatureBoundaries()
	if (violations.length > 0) {
		console.error(
			`Boundary violations: ${violations.length}\n${formatBoundaryViolations(violations)}`,
		)
		process.exitCode = 1
	} else {
		console.log(
			`Feature boundaries OK (${FEATURES.length} features; entries: . | contract | page | presentation | shortcut-contribution; HeroUI visual ownership OK).`,
		)
	}
}
