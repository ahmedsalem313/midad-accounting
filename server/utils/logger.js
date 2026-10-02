const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19)
}

export const logger = {
  info: (msg, ...args) => console.log(`${colors.cyan}[${timestamp()}] ℹ️ ${msg}${colors.reset}`, ...args),
  success: (msg, ...args) => console.log(`${colors.green}[${timestamp()}] ✅ ${msg}${colors.reset}`, ...args),
  warn: (msg, ...args) => console.log(`${colors.yellow}[${timestamp()}] ⚠️ ${msg}${colors.reset}`, ...args),
  error: (msg, ...args) => console.error(`${colors.red}[${timestamp()}] ❌ ${msg}${colors.reset}`, ...args),
  debug: (msg, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${colors.magenta}[${timestamp()}] 🐛 ${msg}${colors.reset}`, ...args)
    }
  },
}