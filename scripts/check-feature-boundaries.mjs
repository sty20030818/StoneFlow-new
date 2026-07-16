#!/usr/bin/env bun
/**
 * Feature public-surface boundary check（β-acl）。
 *
 * ## 规则
 * - 已收口 feature 对外**只能** `from '@/features/<name>'`
 * - 禁止 `from '@/features/<name>/…`（深路径）
 * - 同 feature 目录内的深 import **允许**（实现细节）
 * - 可选：`*.test.*` 在「被测 feature 外」也禁止深路径（与生产一致）
 *
 * ## 扩全仓
 * 将 FEATURES 数组加入更多 name 即可；全绿后可考虑 eslint-plugin-boundaries。
 *
 * 用法：`bun run scripts/check-feature-boundaries.mjs`
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * 已收口 public 的 feature。
 * β-acl-1: task
 * β-acl-2: selection / submit / filter / danger-confirm
 * β-acl-3: project / space / view / lifecycle
 * 扩全仓时按波次追加 name。
 *
 * @type {readonly string[]}
 */
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
	// β-acl-4
	'command',
	'settings',
	'entity-detail',
	'metadata-fields',
	'display-options',
	'bulk-action',
	'sync',
	// β-acl-5
	'quick-create',
	'global-search',
	'update',
	'workspace',
	'activity',
	'project-overview',
]

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
 * importer 是否位于某 feature 树内（允许深 import 自己）。
 * @param {string} fileAbs
 * @param {string} feature
 */
function isInsideFeature(fileAbs, feature) {
	const rel = relative(SRC, fileAbs).replaceAll('\\', '/')
	return rel.startsWith(`features/${feature}/`) || rel === `features/${feature}`
}

/**
 * 已知的「有意深 import」（避免 public 桶拉 UI 形成环）。
 * 仅限纯 model / 无 React 装配路径。
 *
 * @param {string} fileAbs
 * @param {string} feature
 * @param {string} line
 */
function isAllowlistedDeepImport(fileAbs, feature, line) {
	const rel = relative(SRC, fileAbs).replaceAll('\\', '/')
	// navigation intents 只读 settings 分区记忆，不可经 public 拉 SettingsPage
	if (
		feature === 'settings' &&
		rel.startsWith('app/navigation/') &&
		/from\s+['"]@\/features\/settings\/model\//.test(line)
	) {
		return true
	}
	// task shortcuts 只取 command 纯 core/keybinding，避免 command↔task public 桶环依赖
	if (
		feature === 'command' &&
		rel.startsWith('features/task/') &&
		/from\s+['"]@\/features\/command\/(core|keybinding)/.test(line)
	) {
		return true
	}
	// navigation 只取 command adapter 类型定义，避免 command 桶初始化
	if (
		feature === 'command' &&
		rel.startsWith('app/navigation/') &&
		/from\s+['"]@\/features\/command\/adapters\//.test(line)
	) {
		return true
	}
	return false
}

const deepImportRe = (feature) =>
	new RegExp(String.raw`from\s+['"]@/features/${feature}/[^'"]+['"]`, 'g')

/** @type {Array<{ file: string, feature: string, line: number, text: string }>} */
const violations = []

for (const file of walkTsFiles(SRC)) {
	const text = readFileSync(file, 'utf8')
	const lines = text.split('\n')
	for (const feature of FEATURES) {
		if (isInsideFeature(file, feature)) continue
		const re = deepImportRe(feature)
		lines.forEach((line, idx) => {
			if (re.test(line)) {
				if (!isAllowlistedDeepImport(file, feature, line)) {
					violations.push({
						file: relative(join(SRC, '..'), file),
						feature,
						line: idx + 1,
						text: line.trim(),
					})
				}
			}
			re.lastIndex = 0
		})
	}
}

if (violations.length > 0) {
	console.error('Feature boundary violations (deep import of public features):\n')
	for (const v of violations) {
		console.error(`  ${v.file}:${v.line}`)
		console.error(`    ${v.text}`)
		console.error(`    → use: import { … } from '@/features/${v.feature}'\n`)
	}
	console.error(`Total: ${violations.length} (pilot features: ${FEATURES.join(', ')})`)
	process.exit(1)
}

console.log(`Feature boundaries OK (${FEATURES.length} features: ${FEATURES.join(', ')}).`)
