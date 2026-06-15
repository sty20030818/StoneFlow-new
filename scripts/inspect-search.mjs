import { Database } from 'bun:sqlite'
import os from 'node:os'
import path from 'node:path'

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'com.stonefish.stoneflow', 'stoneflow.sqlite3')
const db = new Database(dbPath, { readonly: true })

function searchTasks(query) {
	const pattern = `%${query}%`
	return db
		.query(
			`SELECT title, status FROM tasks
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND status IN ('doing','todo','waiting')
         AND (title LIKE ? OR note LIKE ?)
       ORDER BY updated_at DESC`,
		)
		.all(pattern, pattern)
}

function searchProjects(query) {
	const pattern = `%${query}%`
	return db
		.query(
			`SELECT name, completed_at FROM projects
       WHERE deleted_at IS NULL AND archived_at IS NULL
         AND completed_at IS NULL
         AND (name LIKE ? OR description LIKE ?)
       ORDER BY updated_at DESC`,
		)
		.all(pattern, pattern)
}

for (const query of ['待', '进行', '项目', 'xxx', 'task']) {
	console.log(
		JSON.stringify(
			{
				query,
				tasks: searchTasks(query),
				projects: searchProjects(query),
			},
			null,
			2,
		),
	)
}

db.close()
