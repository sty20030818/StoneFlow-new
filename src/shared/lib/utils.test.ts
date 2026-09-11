import { cn } from './utils'

describe('cn', () => {
	it('保留空输入的字符串返回值', () => {
		expect(cn()).toBe('')
		expect(cn(null, undefined, false, '', 0)).toBe('')
	})

	it('展开嵌套数组和条件对象，不加入关闭的条件类', () => {
		expect(
			cn('flex', ['items-center', [false, null, 'gap-2']], {
				'opacity-50': true,
				'pointer-events-none': false,
			}),
		).toBe('flex items-center gap-2 opacity-50')
	})

	it('按调用顺序解决覆盖，并保留独立方向和语义类', () => {
		expect(cn('entity-row px-2 py-1 text-muted', 'px-4 text-foreground')).toBe(
			'entity-row py-1 px-4 text-foreground',
		)
		expect(cn('p-3', 'px-2')).toBe('p-3 px-2')
		expect(cn('px-2', 'p-3')).toBe('p-3')
	})

	it('分别合并响应式、交互状态和任意 variant', () => {
		expect(
			cn(
				'px-2 hover:px-2 md:px-2 data-[selected=true]:bg-surface',
				'hover:px-4 md:px-4 data-[selected=true]:bg-accent',
			),
		).toBe('px-2 hover:px-4 md:px-4 data-[selected=true]:bg-accent')
	})

	it('保留任意值、字号与颜色的独立语义及重要类优先级', () => {
		expect(cn('w-8 text-sm text-muted', 'w-[var(--row-width)] text-[14px] text-accent')).toBe(
			'w-[var(--row-width)] text-[14px] text-accent',
		)
		expect(cn('p-2! p-3', 'p-4!')).toBe('p-3 p-4!')
	})
})
