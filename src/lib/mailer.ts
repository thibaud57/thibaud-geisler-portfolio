import nodemailer, { type Transporter } from 'nodemailer'

import { env } from '@/env'

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
