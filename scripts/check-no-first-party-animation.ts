import { readFileSync, readdirSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'

export type AnimationSource = {
	path: string
	source: string
}

export type AnimationViolation = {
	path: string
	line: number
	ruleId: AnimationRuleId
	excerpt: string
}

type AnimationRuleId =
	| 'direct-animation-dependency'
	| 'animation-runtime-import'
	| 'css-animation'
	| 'css-transition'
	| 'motion-token'
	| 'tailwind-animation'
	| 'tailwind-transition'
	| 'tailwind-timing'
	| 'tailwind-motion'
	| 'tailwind-active-scale'
	| 'smooth-scroll'
	| 'web-animations-api'
	| 'view-transition-api'

type SourceRule = {
	ruleId: Exclude<AnimationRuleId, 'direct-animation-dependency'>
	pattern: RegExp
	extensions?: ReadonlySet<string>
}

const SCRIPT_EXTENSIONS = new Set(['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx'])
const TAILWIND_EXTENSIONS = new Set([...SCRIPT_EXTENSIONS, '.html'])
const SCANNED_EXTENSIONS = new Set([...TAILWIND_EXTENSIONS, '.css'])

const SOURCE_RULES: readonly SourceRule[] = [
	{
		ruleId: 'animation-runtime-import',
		pattern:
			/(?:\bfrom\s+|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"](?:motion(?:\/[^'"]*)?|framer-motion(?:\/[^'"]*)?|tw-animate-css|@motionone\/[^'"]+|@react-spring\/[^'"]+|@formkit\/auto-animate|react-spring|auto-animate|animejs|gsap|popmotion|lottie-(?:web|react)|react-transition-group|velocity-animate)['"]/g,
		extensions: new Set([...TAILWIND_EXTENSIONS, '.css']),
	},
	{
		ruleId: 'css-animation',
		pattern: /@keyframes\b|\banimation(?:-[a-z-]+|[A-Z][A-Za-z]+)?\s*:/gi,
	},
	{
		ruleId: 'css-transition',
		pattern: /\btransition(?:-[a-z-]+|[A-Z][A-Za-z]+)?\s*:/g,
	},
	{
		ruleId: 'motion-token',
		pattern: /--[\w-]*(?:animation|transition|motion|duration|delay|ease|easing)[\w-]*\s*:/gi,
	},
	{
		ruleId: 'tailwind-animation',
		pattern:
			/(?:^|[\s"'`])((?:[^\s"'`]+:)*(?:animate(?:-[^\s"'`]+)?|(?:fade|zoom)-(?:in|out)(?:-[^\s"'`]+)?|slide-(?:in-from|out-to)-[^\s"'`]+))(?=$|[\s"'`])/gm,
		extensions: TAILWIND_EXTENSIONS,
	},
	{
		ruleId: 'tailwind-transition',
		pattern: /(?:^|[\s"'`])((?:[^\s"'`]+:)*transition(?:-[^\s"'`]+)?)(?=$|[\s"'`])/gm,
		extensions: TAILWIND_EXTENSIONS,
	},
	{
		ruleId: 'tailwind-timing',
		pattern: /(?:^|[\s"'`])((?:[^\s"'`]+:)*(?:duration|delay|ease)-[^\s"'`]+)(?=$|[\s"'`])/gm,
		extensions: TAILWIND_EXTENSIONS,
	},
	{
		ruleId: 'tailwind-motion',
		pattern: /(?:^|[\s"'`])((?:[^\s"'`]+:)*motion-(?:safe|reduce):[^\s"'`]+)(?=$|[\s"'`])/gm,
		extensions: TAILWIND_EXTENSIONS,
	},
	{
		ruleId: 'tailwind-active-scale',
		pattern: /(?:^|[\s"'`])((?:[^\s"'`]+:)*active:scale-[^\s"'`]+)(?=$|[\s"'`])/gm,
		extensions: TAILWIND_EXTENSIONS,
	},
	{
		ruleId: 'smooth-scroll',
		pattern:
			/\bscroll-behavior\s*:\s*smooth\b|\bscrollBehavior\s*:\s*['"]smooth['"]|\bbehavior\s*:\s*['"]smooth['"]|(?:^|[\s"'`])(?:[^\s"'`]+:)*scroll-smooth(?=$|[\s"'`])/gm,
	},
	{
		ruleId: 'web-animations-api',
		pattern: /\.animate\s*\(|\.getAnimations\s*\(|\bnew\s+(?:Animation|KeyframeEffect)\s*\(/g,
		extensions: TAILWIND_EXTENSIONS,
	},
	{
		ruleId: 'view-transition-api',
		pattern:
			/\bstartViewTransition\s*\(|\bviewTransitionName\s*:|\bview-transition-(?:name|class)\s*:|::view-transition-|@view-transition\b/g,
	},
]

const FORBIDDEN_DEPENDENCIES = new Set([
	'tw-animate-css',
	'framer-motion',
	'react-spring',
	'@formkit/auto-animate',
	'auto-animate',
	'animejs',
	'gsap',
	'popmotion',
	'lottie-web',
	'lottie-react',
	'react-transition-group',
	'velocity-animate',
])

function isForbiddenDependency(name: string) {
	return (
		FORBIDDEN_DEPENDENCIES.has(name) ||
		name.startsWith('@motionone/') ||
		name.startsWith('@react-spring/')
	)
}

function lineNumber(source: string, index: number) {
	return source.slice(0, index).split('\n').length
}

function excerptAt(source: string, index: number) {
	const lineStart = source.lastIndexOf('\n', index - 1) + 1
	const lineEnd = source.indexOf('\n', index)
	const excerpt = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd).trim()
	return excerpt.length > 180 ? `${excerpt.slice(0, 177)}...` : excerpt
}

function allowedResizeTransitionOffsets(source: string) {
	const offsets = new Set<number>()
	const blockPattern = /([^{}]+)\{([^{}]*)\}/gs

	for (const block of source.matchAll(blockPattern)) {
		if (!block[1].includes('[data-resizing')) continue
		const bodyOffset = (block.index ?? 0) + block[0].lastIndexOf(block[2])
		for (const transition of block[2].matchAll(/\btransition\s*:\s*none\s*;?/g)) {
			offsets.add(bodyOffset + (transition.index ?? 0))
		}
	}

	return offsets
}

function scanPackageJson(file: AnimationSource) {
	const manifest = JSON.parse(file.source) as {
		dependencies?: Record<string, string>
		devDependencies?: Record<string, string>
		optionalDependencies?: Record<string, string>
		peerDependencies?: Record<string, string>
	}
	const violations: AnimationViolation[] = []

	for (const dependencies of [
		manifest.dependencies,
		manifest.devDependencies,
		manifest.optionalDependencies,
		manifest.peerDependencies,
	]) {
		for (const name of Object.keys(dependencies ?? {})) {
			if (!isForbiddenDependency(name)) continue
			const index = file.source.indexOf(JSON.stringify(name))
			violations.push({
				path: file.path,
				line: lineNumber(file.source, Math.max(index, 0)),
				ruleId: 'direct-animation-dependency',
				excerpt: name,
			})
		}
	}

	return violations
}

export function scanFirstPartyAnimationSources(sources: readonly AnimationSource[]) {
	const violations: AnimationViolation[] = []

	for (const file of sources) {
		if (file.path === 'package.json') {
			violations.push(...scanPackageJson(file))
			continue
		}

		const extension = extname(file.path)
		const allowedTransitions =
			extension === '.css' ? allowedResizeTransitionOffsets(file.source) : null

		for (const rule of SOURCE_RULES) {
			if (rule.extensions && !rule.extensions.has(extension)) continue
			for (const match of file.source.matchAll(rule.pattern)) {
				const index = match.index ?? 0
				if (rule.ruleId === 'css-transition' && allowedTransitions?.has(index)) continue
				violations.push({
					path: file.path,
					line: lineNumber(file.source, index),
					ruleId: rule.ruleId,
					excerpt: excerptAt(file.source, index),
				})
			}
		}
	}

	const seen = new Set<string>()
	return violations.filter((violation) => {
		const key = `${violation.path}:${violation.line}:${violation.ruleId}`
		if (seen.has(key)) return false
		seen.add(key)
		return true
	})
}

function isProductionSource(path: string) {
	return (
		SCANNED_EXTENSIONS.has(extname(path)) &&
		!/(^|\/)(?:__tests__|test)(?:\/|$)/.test(path) &&
		!/\.(?:test|spec|stories)\.[^/]+$/.test(path)
	)
}

function collectSourceFiles(repositoryRoot: string, directory: string): AnimationSource[] {
	const files: AnimationSource[] = []
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const absolutePath = resolve(directory, entry.name)
		if (entry.isDirectory()) {
			files.push(...collectSourceFiles(repositoryRoot, absolutePath))
		} else {
			const path = relative(repositoryRoot, absolutePath).replaceAll('\\', '/')
			if (entry.isFile() && isProductionSource(path)) {
				files.push({ path, source: readFileSync(absolutePath, 'utf8') })
			}
		}
	}
	return files
}

export function scanFirstPartyAnimations(repositoryRoot = resolve(import.meta.dir, '..')) {
	const sources: AnimationSource[] = [
		{ path: 'package.json', source: readFileSync(resolve(repositoryRoot, 'package.json'), 'utf8') },
		{ path: 'index.html', source: readFileSync(resolve(repositoryRoot, 'index.html'), 'utf8') },
		{
			path: 'launcher.html',
			source: readFileSync(resolve(repositoryRoot, 'launcher.html'), 'utf8'),
		},
		...collectSourceFiles(repositoryRoot, resolve(repositoryRoot, 'src')),
	]
	return scanFirstPartyAnimationSources(sources)
}

export function formatFirstPartyAnimationViolations(violations: readonly AnimationViolation[]) {
	return violations
		.map(({ path, line, ruleId, excerpt }) => `${path}:${line} [${ruleId}] ${excerpt}`)
		.join('\n')
}

if (import.meta.main) {
	const violations = scanFirstPartyAnimations()
	if (violations.length > 0) {
		console.error(
			`第一方动画扫描失败：${violations.length} 处\n${formatFirstPartyAnimationViolations(violations)}`,
		)
		process.exitCode = 1
	} else {
		console.log('第一方动画扫描通过')
	}
}
