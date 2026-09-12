import base from '../../vitest.config.ts'
export default {
	...base,
	test: {
		...base.test,
		projects: [
			{
				test: {
					name: 'views-audit',
					environment: 'jsdom',
					setupFiles: ['./src/test/failOnUnexpectedConsole.ts', './src/test/setup.ts'],
					include: ['.scratch/views-system-audit/*.test.tsx'],
				},
			},
		],
	},
}
