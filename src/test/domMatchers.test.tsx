import { render, screen } from '@testing-library/react'
import { expectTypeOf } from 'vitest'

it('DOM matcher 保留同步与异步返回类型及断言行为', async () => {
	render(<button>保存设置</button>)
	const button = screen.getByRole('button', { name: '保存设置' })

	const syncResult = expect(button).toBeVisible()
	expectTypeOf(syncResult).toEqualTypeOf<void>()

	const assertText = () => expect(Promise.resolve(button)).resolves.toHaveTextContent(/保存/)
	expectTypeOf(assertText).returns.toEqualTypeOf<Promise<void>>()
	await assertText()

	expect(button).toEqual(expect.toHaveTextContent('保存'))
	expect(() => expect(button).toHaveTextContent('删除')).toThrow(/删除/)
})
