import * as matchers from '@testing-library/jest-dom/matchers'
import { expect } from 'vitest'

declare module 'vitest' {
	// R 由 Vitest 区分同步断言与异步断言的返回类型。
	interface Matchers<R, T> extends matchers.TestingLibraryMatchers<unknown, R> {}
}

expect.extend(matchers)

class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

if (!('ResizeObserver' in globalThis)) {
	// HeroUI 浮层和虚拟集合会依赖 ResizeObserver，这里补一个最小桩实现。
	globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver
}

if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.scrollIntoView) {
	Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
		value: () => undefined,
		configurable: true,
		writable: true,
	})
}

if (typeof window !== 'undefined') {
	Object.defineProperty(window, 'scrollTo', {
		value: () => undefined,
		configurable: true,
		writable: true,
	})
}

if (typeof window !== 'undefined' && !window.matchMedia) {
	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: (query: string) => ({
			// 默认不伪造任何媒体能力；依赖断点的测试必须显式安装对应查询。
			matches: false,
			media: query,
			onchange: null,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			addListener: () => undefined,
			removeListener: () => undefined,
			dispatchEvent: () => false,
		}),
	})
}
