import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

export const config = {
  port: parseInt(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'midad-secret-change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  database: {
    path: process.env.DB_PATH 
      ? path.resolve(__dirname, process.env.DB_PATH)
      : path.join(__dirname, 'database', 'data', 'midad.db'),
  },
  
  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
  },
  
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    interval: process.env.BACKUP_INTERVAL || '24h',
  },
  
  uploads: {
    path: path.join(__dirname, 'uploads'),
  },
  
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3001'],
    credentials: true,
  },
}