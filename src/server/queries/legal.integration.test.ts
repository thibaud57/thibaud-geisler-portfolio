import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}))

import { prisma, resetDatabase } from '@/lib/prisma-test-setup'
import {
  getDataProcessors,
  getHostingProvider,
  getPublisher,
} from '@/server/queries/legal'
import {
  dataProcessings,
  legalEntities,
  publisher,
} from '../../../prisma/seed-data/legal'

type SeedLegalOptions = {
  withPublisher?: boolean
  withIonosHosting?: boolean
  withIonosSmtp?: boolean
  withCalendly?: boolean
}

async function seedLegalForTest(options: SeedLegalOptions = {}) {
  const {
    withPublisher = true,
    withIonosHosting = true,
    withIonosSmtp = true,
    withCalendly = true,
  } = options

  const slugFilter: Record<string, boolean> = {
    thibaud: withPublisher,
    'ionos-sarl': withIonosHosting || withIonosSmtp,
    'calendly-inc': withCalendly,
  }
  const processingFilter: Record<string, boolean> = {
    'ionos-hosting': withIonosHosting,
    'ionos-smtp': withIonosSmtp,
    'calendly-embedded': withCalendly,
  }

  const slugToId = new Map<string, string>()

  for (const entity of legalEntities) {
    if (!slugFilter[entity.slug]) continue
    const created = await prisma.legalEntity.create({
      data: {
        slug: entity.slug,
        name: entity.name,
        legalStatusKey: entity.legalStatusKey,
        siret: entity.siret,
        vatNumber: entity.vatNumber,
        rcsCity: entity.rcsCity,
        rcsNumber: entity.rcsNumber,
        phone: entity.phone,
        capitalAmount: entity.capitalAmount,
        capitalCurrency: entity.capitalCurrency,
        address: { create: entity.address },
      },
    })
    slugToId.set(entity.slug, created.id)
  }

  if (withPublisher) {
    const publisherEntityId = slugToId.get(publisher.legalEntitySlug)
    if (!publisherEntityId) {
      throw new Error(
        `Publisher requires LegalEntity "${publisher.legalEntitySlug}" but its seed was filtered out`,
      )
    }
    await prisma.publisher.create({
      data: {
        legalEntityId: publisherEntityId,
        siren: publisher.siren,
        apeCode: publisher.apeCode,
        registrationType: publisher.registrationType,
        vatRegime: publisher.vatRegime,
        publicEmail: publisher.publicEmail,
      },
    })
  }

  for (const processing of dataProcessings) {
    if (!processingFilter[processing.slug]) continue
    const ownerId = slugToId.get(processing.legalEntitySlug)
    if (!ownerId) continue
    await prisma.dataProcessing.create({
      data: {
        slug: processing.slug,
        legalEntityId: ownerId,
        kind: processing.kind,
        purposeFr: processing.purposeFr,
        purposeEn: processing.purposeEn,
        retentionPolicyKey: processing.retentionPolicyKey,
        legalBasis: processing.legalBasis,
        outsideEuFramework: processing.outsideEuFramework,
        displayOrder: processing.displayOrder,
      },
    })
  }
}

describe('getPublisher', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("retourne l'éditeur seedé avec address et publisher inclus", async () => {
    await seedLegalForTest({
      withPublisher: true,
      withIonosHosting: false,
      withIonosSmtp: false,
      withCalendly: false,
    })

    const result = await getPublisher()

    expect(result.slug).toBe('thibaud')
    expect(result.siret).toBe('88041912200036')
    expect(result.legalStatusKey).toBe('entrepreneurIndividuel')
    expect(result.address.street).toBe('11 rue Gouvy')
    expect(result.address.city).toBe('Metz')
    expect(result.publisher).not.toBeNull()
    expect(result.publisher?.siren).toBe('880419122')
    expect(result.publisher?.apeCode).toBe('6201Z')
    expect(result.publisher?.registrationType).toBe('RNE')
    expect(result.publisher?.vatRegime).toBe('FRANCHISE')
  })

  it('lance NotFoundError si pas de publisher seedé (DB vide)', async () => {
    await expect(getPublisher()).rejects.toThrow()
  })
})

describe('getDataProcessors', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('retourne tous les processors triés par displayOrder ascendant', async () => {
    await seedLegalForTest({ withPublisher: false })

    const result = await getDataProcessors()

    expect(result.map((p) => p.processing.slug)).toEqual([
      'ionos-hosting',
      'calendly-embedded',
      'ionos-smtp',
    ])
  })

  it('retourne outsideEuFramework=DATA_PRIVACY_FRAMEWORK pour Calendly et null pour IONOS', async () => {
    await seedLegalForTest({ withPublisher: false })

    const result = await getDataProcessors()
    const bySlug = Object.fromEntries(
      result.map((entry) => [entry.processing.slug, entry.processing.outsideEuFramework]),
    )

    expect(bySlug['calendly-embedded']).toBe('DATA_PRIVACY_FRAMEWORK')
    expect(bySlug['ionos-hosting']).toBeNull()
    expect(bySlug['ionos-smtp']).toBeNull()
  })

  it('retourne legalBasis=CONSENT pour Calendly et LEGITIMATE_INTERESTS pour IONOS', async () => {
    await seedLegalForTest({ withPublisher: false })

    const result = await getDataProcessors()
    const bySlug = Object.fromEntries(
      result.map((entry) => [entry.processing.slug, entry.processing.legalBasis]),
    )

    expect(bySlug['calendly-embedded']).toBe('CONSENT')
    expect(bySlug['ionos-hosting']).toBe('LEGITIMATE_INTERESTS')
    expect(bySlug['ionos-smtp']).toBe('LEGITIMATE_INTERESTS')
  })
})

describe('getHostingProvider', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('retourne IONOS hosting (kind=HOSTING)', async () => {
    await seedLegalForTest({ withPublisher: false })

    const result = await getHostingProvider()

    expect(result.slug).toBe('ionos-sarl')
    expect(result.name).toBe('IONOS SARL')
    expect(result.address.city).toBe('Sarreguemines')
    expect(result.processing.kind).toBe('HOSTING')
    expect(result.processing.purposeFr).toContain('Hébergement')
  })

  it('lance si aucun HOSTING seedé (uniquement Calendly)', async () => {
    await seedLegalForTest({
      withPublisher: false,
      withIonosHosting: false,
      withIonosSmtp: false,
      withCalendly: true,
    })

    await expect(getHostingProvider()).rejects.toThrow()
  })
})
