import nodemailer, { type Transporter } from 'nodemailer'
import { z } from 'zod'

const envSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.email(),
  MAIL_TO: z.email(),
})

const env = envSchema.parse(process.env)

export const transporter: Transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
})

export const MAIL_FROM = env.SMTP_FROM
export const MAIL_TO = env.MAIL_TO
