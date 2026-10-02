import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from '../config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let db = null

export function initDatabase() {
  if (db) return db

  // التأكد من وجود مجلد data
  const dataDir = path.dirname(config.database.path)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  // فتح قاعدة البيانات
  db = new Database(config.database.path)

  // قراءة ملف schema.sql وتنفيذه
  const schemaPath = path.join(__dirname, 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf8')
  db.exec(schema)

  console.log('✅ Database initialized at:', config.database.path)
  return db
}

export function getDB() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

export function closeDB() {
  if (db) {
    db.close()
    db = null
    console.log('🔒 Database closed')
  }
}