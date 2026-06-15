#!/usr/bin/env node
/**
 * 清理 StoneFlow 测试残留的临时 SQLite 目录。
 *
 * 用法：
 *   node scripts/cleanup-test-dbs.mjs           # 删除所有匹配的测试目录
 *   node scripts/cleanup-test-dbs.mjs --stale-only # 仅删除超过 24 小时的目录
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const STALE_MS = 24 * 60 * 60 * 1000
const staleOnly = process.argv.includes('--stale-only')
const countOnly = process.argv.includes('--count-only')

function isStoneflowTestDir(name) {
	return (
		name.startsWith('stoneflow-test-') ||
		name.startsWith('stoneflow-stage') ||
		name.startsWith('stoneflow-quick-create') ||
		name.startsWith('stoneflow-search') ||
		name.startsWith('stoneflow-project') ||
		name.startsWith('stoneflow-task')
	)
}

function removeDir(target) {
	try {
		fs.rmSync(target, { recursive: true, force: true })
		return true
	} catch {
		return false
	}
}

const tempDir = os.tmpdir()
let removed = 0
let failed = 0
let matched = 0

for (const entry of fs.readdirSync(tempDir, { withFileTypes: true })) {
	if (!entry.isDirectory() || !isStoneflowTestDir(entry.name)) {
		continue
	}

	matched += 1
	const fullPath = path.join(tempDir, entry.name)

	if (countOnly) {
		continue
	}

	if (staleOnly) {
		const stat = fs.statSync(fullPath)
		const ageMs = Date.now() - stat.mtimeMs
		if (ageMs < STALE_MS) {
			continue
		}
	}

	if (removeDir(fullPath)) {
		removed += 1
	} else {
		failed += 1
	}
}

if (countOnly) {
	console.log(`[cleanup-test-dbs:count] matched=${matched} temp=${tempDir}`)
	process.exit(0)
}

const mode = staleOnly ? 'stale-only' : 'all'
console.log(`[cleanup-test-dbs:${mode}] removed=${removed} failed=${failed} temp=${tempDir}`)

process.exit(failed > 0 ? 1 : 0)
