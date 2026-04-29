import { z } from 'zod'

const VatRegimeSchema = z.enum(['FRANCHISE', 'ASSUJETTI'])

const ProcessingKindSchema = z.enum([
  'HOSTING',
  'EMBEDDED_SERVICE',
  'EMAIL_PROVIDER',
  'ANALYTICS',
])

const LegalBasisSchema = z.enum([
  'CONSENT',
  'CONTRACT',
  'LEGAL_OBLIGATION',
  'VITAL_INTERESTS',
  'PUBLIC_TASK',
  'LEGITIMATE_INTERESTS',
])

const OutsideEuFrameworkSchema = z.enum([
  'DATA_PRIVACY_FRAMEWORK',
  'STANDARD_CONTRACTUAL_CLAUSES',
  'ADEQUACY_DECISION',
  'BINDING_CORPORATE_RULES',
])

export const AddressSchema = z.object({
  street: z.string().min(1),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
})

export const LegalEntitySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  legalStatusKey: z.string().min(1),
  siret: z.string().nullable(),
  vatNumber: z.string().nullable(),
  rcsCity: z.string().nullable(),
  rcsNumber: z.string().nullable(),
  phone: z.string().nullable(),
  capitalAmount: z.number().int().positive().nullable(),
  capitalCurrency: z.string().nullable(),
  address: AddressSchema,
})

export const PublisherSchema = z.object({
  legalEntitySlug: z.string().min(1),
  siren: z.string().min(1),
  apeCode: z.string().min(1),
  registrationType: z.string().min(1),
  vatRegime: VatRegimeSchema,
  publicEmail: z.email(),
})

export const DataProcessingSchema = z.object({
  slug: z.string().min(1),
  legalEntitySlug: z.string().min(1),
  kind: ProcessingKindSchema,
  purposeFr: z.string().min(1),
  purposeEn: z.string().min(1),
  retentionPolicyKey: z.string().min(1),
  legalBasis: LegalBasisSchema,
  outsideEuFramework: OutsideEuFrameworkSchema.nullable(),
  displayOrder: z.number().int().min(0),
})

export type AddressInput = z.infer<typeof AddressSchema>
export type LegalEntityInput = z.infer<typeof LegalEntitySchema>
export type PublisherInput = z.infer<typeof PublisherSchema>
export type DataProcessingInput = z.infer<typeof DataProcessingSchema>

export const legalEntities: LegalEntityInput[] = [
  {
    slug: 'thibaud',
    name: 'Thibaud Pierre Geisler',
    legalStatusKey: 'entrepreneurIndividuel',
    siret: '88041912200036',
    vatNumber: null,
    rcsCity: null,
    rcsNumber: null,
    phone: null,
    capitalAmount: null,
    capitalCurrency: null,
    address: {
      street: '11 rue Gouvy',
      postalCode: '57000',
      city: 'Metz',
      country: 'France',
    },
  },
  {
    slug: 'ionos-sarl',
    name: 'IONOS SARL',
    legalStatusKey: 'sarl',
    siret: '43130377500016',
    vatNumber: 'FR13431303775',
    rcsCity: 'Sarreguemines',
    rcsNumber: '431 303 775',
    phone: '+33 9 70 80 89 11',
    capitalAmount: 100000,
    capitalCurrency: 'EUR',
    address: {
      street: '7 place de la Gare',
      postalCode: '57200',
      city: 'Sarreguemines',
      country: 'France',
    },
  },
  {
    slug: 'calendly-inc',
    name: 'Calendly LLC',
    legalStatusKey: 'incorporated',
    siret: null,
    vatNumber: null,
    rcsCity: null,
    rcsNumber: null,
    phone: null,
    capitalAmount: null,
    capitalCurrency: null,
    address: {
      street: '271 17th St NW, Suite 1000',
      postalCode: '30363',
      city: 'Atlanta',
      country: 'United States',
    },
  },
]

export const publisher: PublisherInput = {
  legalEntitySlug: 'thibaud',
  siren: '880419122',
  apeCode: '6201Z',
  registrationType: 'RNE',
  vatRegime: 'FRANCHISE',
  publicEmail: 'contact@thibaud-geisler.com',
}

export const dataProcessings: DataProcessingInput[] = [
  {
    slug: 'ionos-hosting',
    legalEntitySlug: 'ionos-sarl',
    kind: 'HOSTING',
    purposeFr: 'Hébergement infrastructure VPS et base de données PostgreSQL',
    purposeEn: 'VPS infrastructure and PostgreSQL database hosting',
    retentionPolicyKey: 'logs3Years',
    legalBasis: 'LEGITIMATE_INTERESTS',
    outsideEuFramework: null,
    displayOrder: 0,
  },
  {
    slug: 'calendly-embedded',
    legalEntitySlug: 'calendly-inc',
    kind: 'EMBEDDED_SERVICE',
    purposeFr: 'Affichage du widget de prise de rendez-vous embarqué (iframe Calendly)',
    purposeEn: 'Display of embedded scheduling widget (Calendly iframe)',
    retentionPolicyKey: 'session13Months',
    legalBasis: 'CONSENT',
    outsideEuFramework: 'DATA_PRIVACY_FRAMEWORK',
    displayOrder: 1,
  },
  {
    slug: 'ionos-smtp',
    legalEntitySlug: 'ionos-sarl',
    kind: 'EMAIL_PROVIDER',
    purposeFr: 'Envoi des emails transactionnels du formulaire de contact via serveur SMTP authentifié',
    purposeEn: 'Transactional email delivery from contact form via authenticated SMTP server',
    retentionPolicyKey: 'logs30Days',
    legalBasis: 'LEGITIMATE_INTERESTS',
    outsideEuFramework: null,
    displayOrder: 2,
  },
]
