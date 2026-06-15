import { Database } from 'bun:sqlite'
import os from 'node:os'
import path from 'node:path'

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'com.stonefish.stoneflow', 'stoneflow.sqlite3')
const db = new Database(dbPath, { readonly: true })

const tasks = db.query('SELECT COUNT(*) AS c FROM tasks WHERE deleted_at IS NULL AND archived_at IS NULL').get()
const projects = db.query('SELECT COUNT(*) AS c FROM projects WHERE deleted_at IS NULL AND archived_at IS NULL').get()
const sample = db
	.query('SELECT title, status FROM tasks WHERE deleted_at IS NULL AND archived_at IS NULL LIMIT 5')
	.all()

console.log(JSON.stringify({ dbPath, tasks, projects, sample }, null, 2))
db.close()
