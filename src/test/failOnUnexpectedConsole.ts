import { afterAll, afterEach, beforeEach } from 'vitest'

function formatConsoleValue(value: unknown) {
	if (value instanceof Error) return value.stack ?? value.message
	if (typeof value === 'string') return value
	try {
		return JSON.stringify(value) ?? String(value)
	} catch {
		return String(value)
	}
}

const originalConsole = {
	warn: console.warn,
	error: console.error,
}

const fileConsole: string[] = []
let testConsole: string[] | null = null

for (const method of ['warn', 'error'] as const) {
	console[method] = (...values: unknown[]) => {
		const output = `console.${method}: ${values.map(formatConsoleValue).join(' ')}`
		;(testConsole ?? fileConsole).push(output)
	}
}

beforeEach(() => {
	testConsole = []
})

afterEach(() => {
	const output = testConsole ?? []
	testConsole = null
	assertNoUnexpectedConsole(output, '测试执行期间')
})

afterAll(() => {
	console.warn = originalConsole.warn
	console.error = originalConsole.error
	assertNoUnexpectedConsole(fileConsole, '测试文件收集或结束阶段')
})

function assertNoUnexpectedConsole(output: string[], phase: string) {
	if (output.length > 0)
		throw new Error(`${phase}产生未接管的 console 输出：\n${output.join('\n')}`)
}
