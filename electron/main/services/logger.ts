import { createLogger, format, transports, type Logger } from 'winston'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

const recentLogs: Array<{ level: string; message: string; timestamp: string }> = []
const MAX_LOGS = 200

let loggerInstance: Logger | null = null

function createAppLogger(): Logger {
  const logDir = join(app.getPath('userData'), 'logs')
  mkdirSync(logDir, { recursive: true })

  const instance = createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
    ),
    transports: [
      new transports.File({ filename: join(logDir, 'app.log'), maxsize: 5_000_000, maxFiles: 3 }),
      new transports.Console()
    ]
  })

  const originalLog = instance.log.bind(instance)
  instance.log = ((levelOrEntry: unknown, ...args: unknown[]) => {
    const level = typeof levelOrEntry === 'string' ? levelOrEntry : 'info'
    const message = args.length ? String(args[0]) : String(levelOrEntry)
    recentLogs.unshift({
      level,
      message,
      timestamp: new Date().toISOString()
    })
    if (recentLogs.length > MAX_LOGS) recentLogs.pop()
    return originalLog(levelOrEntry as never, ...args)
  }) as typeof instance.log

  return instance
}

export const logger = {
  info: (message: string) => getLogger().info(message),
  warn: (message: string) => getLogger().warn(message),
  error: (message: string) => getLogger().error(message)
}

function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = createAppLogger()
  }
  return loggerInstance
}

export function getRecentLogs(limit = 100) {
  return recentLogs.slice(0, limit)
}
