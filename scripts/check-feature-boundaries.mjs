#!/usr/bin/env bun
/**
 * Feature public-surface boundary check（β-acl 终态）。
 *
 * ## 合法跨 feature import
 *
 * ```ts
 * from '@/features/<name>'            // 主入口
 * from '@/features/<name>/contract'   // 纯契约（无 React Page）
 * from '@/features/<name>/page'       // 仅页面（routes）
 * ```
 *
 * ## 禁止
 * - `@/features/<name>/api|hooks|model|components|…` 任意其它深路径
 * - 同 feature 内部深 import **允许**
 *
 * 用法：`bun run scripts/check-feature-boundaries.mjs`
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/** @type {readonly string[]} */
const FEATURES = [
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
	'quick-create',
	'global-search',
	'update',
	'workspace',
	'activity',
	'project-overview',
	'shell-dialogs',
	'entity-scene',
]

/** 稳定第二/第三入口（目前仅 settings 落地；其它 feature 尚未建文件也不算违规，但禁止任意深路径） */
const STABLE_SUFFIXES = ['contract', 'page']

const SRC = join(import.meta.dir, '..', 'src')

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walkTsFiles(dir) {
	/** @type {string[]} */
	const out = []
	for (const name of readdirSync(dir)) {
		const full = join(dir, name)
		const st = statSync(full)
		if (st.isDirectory()) {
			if (name === 'node_modules' || name === 'dist') continue
			out.push(...walkTsFiles(full))
			continue
		}
		if (name.endsWith('.ts') || name.endsWith('.tsx')) {
			out.push(full)
		}
	}
	return out
}

/**
 * @param {string} fileAbs
 * @param {string} feature
 */
function isInsideFeature(fileAbs, feature) {
	const rel = relative(SRC, fileAbs).replaceAll('\\', '/')
	return rel.startsWith(`features/${feature}/`) || rel === `features/${feature}`
}

/**
 * `@/features/foo` | `@/features/foo/contract` | `@/features/foo/page` → legal
 * `@/features/foo/model/x` → illegal
 *
 * @param {string} feature
 * @param {string} importPath  // without quotes, e.g. @/features/settings/contract
 */
function isLegalFeatureImportPath(feature, importPath) {
	const base = `@/features/${feature}`
	if (importPath === base) return true
	for (const suffix of STABLE_SUFFIXES) {
		if (importPath === `${base}/${suffix}`) return true
	}
	return false
}

/** @type {Array<{ file: string, feature: string, line: number, text: string }>} */
const violations = []

const importPathRe = /from\s+['"](@\/features\/[^'"]+)['"]/g
const mockPathRe = /vi\.mock\(\s*['"](@\/features\/[^'"]+)['"]/g

for (const file of walkTsFiles(SRC)) {
	const text = readFileSync(file, 'utf8')
	const lines = text.split('\n')
	lines.forEach((line, idx) => {
		for (const re of [importPathRe, mockPathRe]) {
			re.lastIndex = 0
			let m
			while ((m = re.exec(line)) !== null) {
				const importPath = m[1]
				for (const feature of FEATURES) {
					const prefix = `@/features/${feature}`
					if (importPath !== prefix && !importPath.startsWith(`${prefix}/`)) {
						continue
					}
					if (isInsideFeature(file, feature)) {
						continue
					}
					if (!isLegalFeatureImportPath(feature, importPath)) {
						violations.push({
							file: relative(join(SRC, '..'), file),
							feature,
							line: idx + 1,
							text: line.trim(),
						})
					}
				}
			}
		}
	})
}

if (violations.length > 0) {
	console.error('Feature boundary violations:\n')
	for (const v of violations) {
		console.error(`  ${v.file}:${v.line}`)
		console.error(`    ${v.text}`)
		console.error(`    → 合法: @/features/${v.feature} | …/contract | …/page（禁止其它深路径）\n`)
	}
	console.error(`Total: ${violations.length}`)
	process.exit(1)
}

console.log(`Feature boundaries OK (${FEATURES.length} features; entries: . | contract | page).`)
