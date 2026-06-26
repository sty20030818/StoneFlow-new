import { z } from 'zod'

export const httpUrlString = z
	.string()
	.trim()
	.url('请输入有效链接')
	.refine((value) => value.startsWith('http://') || value.startsWith('https://'), {
		message: '当前阶段只支持 http / https 链接',
	})
