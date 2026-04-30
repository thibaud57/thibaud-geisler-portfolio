import 'server-only'
import pino from 'pino'

import { env } from '@/env'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: { service: 'thibaud-geisler-portfolio' },
  redact: {
    paths: [
      '*.password',
      '*.pass',
      '*.secret',
      '*.token',
      '*.key',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isDev ? { target: 'pino-pretty' } : undefined,
})
