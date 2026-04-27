import { describe, expect, it } from 'vitest'
import { contactSchema } from './contact'

describe('contactSchema', () => {
  it('accepte un payload valide minimal sans company', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Alice')
      expect(result.data.email).toBe('alice@acme.fr')
      expect(result.data.subject).toBe('Projet IA')
      expect(result.data.message).toBe('Bonjour, j’aimerais discuter d’un projet IA dans ma boite.')
      expect(result.data.company).toBeUndefined()
    }
  })

  it('trim les champs string requis (name, email, subject, message)', () => {
    const result = contactSchema.safeParse({
      name: '  Alice  ',
      email: '  alice@acme.fr  ',
      subject: '  Projet IA  ',
      message: '  Bonjour, j’aimerais discuter d’un projet IA dans ma boite.  ',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Alice')
      expect(result.data.email).toBe('alice@acme.fr')
      expect(result.data.subject).toBe('Projet IA')
      expect(result.data.message).toBe('Bonjour, j’aimerais discuter d’un projet IA dans ma boite.')
    }
  })

  it('retourne le code "name_required" quand name est vide après trim', () => {
    const result = contactSchema.safeParse({
      name: '   ',
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toEqual(['name_required'])
    }
  })

  it('retourne le code "subject_required" quand subject est vide', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'alice@acme.fr',
      subject: '',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.subject).toEqual(['subject_required'])
    }
  })

  it('retourne le code "name_too_long" quand name dépasse 120 caractères', () => {
    const result = contactSchema.safeParse({
      name: 'a'.repeat(121),
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toEqual(['name_too_long'])
    }
  })

  it('retourne le code "email_too_long" quand email dépasse 200 caractères', () => {
    const longLocalPart = 'a'.repeat(200)
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: `${longLocalPart}@acme.fr`,
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain('email_too_long')
    }
  })

  it('retourne le code "subject_too_long" quand subject dépasse 200 caractères', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'alice@acme.fr',
      subject: 'a'.repeat(201),
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.subject).toEqual(['subject_too_long'])
    }
  })

  it('retourne le code "company_too_long" quand company dépasse 200 caractères', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      company: 'a'.repeat(201),
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.company).toEqual(['company_too_long'])
    }
  })

  it('retourne le code "message_too_long" quand message dépasse 5000 caractères', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'a'.repeat(5001),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.message).toEqual(['message_too_long'])
    }
  })

  it('retourne le code "email_invalid" quand email ne matche pas le format', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'pas-un-email',
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toEqual(['email_invalid'])
    }
  })

  it('retourne le code "message_too_short" quand message a moins de 20 caractères', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'Trop court',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.message).toEqual(['message_too_short'])
    }
  })

  it('accepte company absente (data.company === undefined)', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.company).toBeUndefined()
    }
  })

  it('ignore silencieusement un champ inconnu (ex: honeypot website)', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
      website: 'spam-bot-filled',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('website')
    }
  })
})
