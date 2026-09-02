import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const repositoryRoot = resolve(import.meta.dir, '..')
const git = (...args: string[]) =>
	execFileSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' }).trim()

if (git('status', '--porcelain=v1')) {
	throw new Error('TaskBoard benchmark 只能从 clean worktree 构建')
}

const commit = git('rev-parse', '--verify', 'HEAD^{commit}')
console.info(`构建 TaskBoard benchmark：${commit}`)
execFileSync('bun', ['run', 'build'], {
	cwd: repositoryRoot,
	stdio: 'inherit',
	env: {
		...process.env,
		VITE_BENCHMARK_COMMIT: commit,
		VITE_TASK_BOARD_BENCHMARK: '1',
	},
})
