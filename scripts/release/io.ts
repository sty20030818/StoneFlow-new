import { existsSync } from 'node:fs'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const color = (code: number) => (text: string) => `\x1b[${code}m${text}\x1b[0m`
export const chalk = {
	red: color(31),
	green: color(32),
	yellow: color(33),
	blue: color(34),
	gray: color(90),
	cyan: color(36),
}

export async function readJSON<T>(filePath: string): Promise<T> {
	return JSON.parse(await readFile(filePath, 'utf8')) as T
}

export async function writeJSON(filePath: string, data: unknown) {
	await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`)
}

export async function listDirFiles(
	dir: string,
	predicate: (fileName: string) => boolean,
): Promise<string[]> {
	if (!existsSync(dir)) return []
	const entries = await readdir(dir, { withFileTypes: true })
	return entries
		.filter((entry) => entry.isFile() && predicate(entry.name))
		.map((entry) => path.join(dir, entry.name))
		.sort((a, b) => path.basename(a).localeCompare(path.basename(b)))
}

function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export async function logArtifact(label: string, filePath: string) {
	const info = await stat(filePath)
	console.log(chalk.green(`   ✓ ${label}: ${path.basename(filePath)}`))
	console.log(chalk.gray(`     path : ${filePath}`))
	console.log(chalk.gray(`     size : ${formatBytes(info.size)} (${info.size} bytes)`))
	console.log(chalk.gray(`     mtime: ${info.mtime.toISOString()}`))
}
