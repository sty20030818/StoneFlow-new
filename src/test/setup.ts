import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

if (!('ResizeObserver' in globalThis)) {
	// cmdk 在测试环境里会依赖 ResizeObserver，这里补一个最小桩实现。
	globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver
}

if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.scrollIntoView) {
	Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
		value: () => undefined,
		configurable: true,
		writable: true,
	})
}

if (typeof window !== 'undefined' && !window.matchMedia) {
	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: (query: string) => ({
			matches: true,
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

afterEach(() => {
	cleanup()
	vi.restoreAllMocks()
})
