import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .optional(),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_USER: z.string().min(1),
    SMTP_PASS: z.string().min(1),
    SMTP_FROM: z.email(),
    MAIL_TO: z.email(),
  },
  client: {
    NEXT_PUBLIC_SITE_URL: z.url(),
    NEXT_PUBLIC_CALENDLY_URL_FR: z.url().optional(),
    NEXT_PUBLIC_CALENDLY_URL_EN: z.url().optional(),
    NEXT_PUBLIC_BUILD_YEAR: z.string().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    MAIL_TO: process.env.MAIL_TO,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_CALENDLY_URL_FR: process.env.NEXT_PUBLIC_CALENDLY_URL_FR,
    NEXT_PUBLIC_CALENDLY_URL_EN: process.env.NEXT_PUBLIC_CALENDLY_URL_EN,
    NEXT_PUBLIC_BUILD_YEAR: process.env.NEXT_PUBLIC_BUILD_YEAR,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
