import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'name_required').max(120, 'name_too_long'),
  company: z.string().trim().max(200, 'company_too_long').optional(),
  email: z.string().trim().pipe(z.email('email_invalid').max(200, 'email_too_long')),
  subject: z.string().trim().min(1, 'subject_required').max(200, 'subject_too_long'),
  message: z.string().trim().min(20, 'message_too_short').max(5000, 'message_too_long'),
})

export type ContactInput = z.infer<typeof contactSchema>
