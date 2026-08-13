import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'

import { checkShellThemeSync } from './check-shell-theme-sync'

const repositoryRoot = resolve(import.meta.dir, '..')

describe('shell theme sync', () => {
	test('CSS theme、两个入口与 Rust 原生窗口使用同一首帧合同', () => {
		expect(checkShellThemeSync(repositoryRoot)).toEqual({
			main: '#fcfcfd',
			shell: '#f3f3f4',
		})
	})
})
