import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'

import { checkShellThemeSync, requireStyleImports } from './check-shell-theme-sync'

const repositoryRoot = resolve(import.meta.dir, '..')

describe('shell theme sync', () => {
	test('CSS theme、两个入口与 Rust 原生窗口使用同一首帧合同', () => {
		expect(checkShellThemeSync(repositoryRoot)).toEqual({
			main: '#fcfcfd',
			shell: '#f3f3f4',
		})
	})

	test('拒绝任何额外样式入口语法', () => {
		expect(() =>
			requireStyleImports(`
@import "tailwindcss";
@import "@heroui/styles";
@import "@heroui-pro/react/css";
@import "./fonts.css";
@import "./theme.css";
@import "./components.css";
@import "./base.css";
@import url("./legacy.css");
`),
		).toThrow('styles/index.css 导入合同错误')
	})
})
