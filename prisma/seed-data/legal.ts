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

const DataCategorySchema = z.enum([
  'IDENTITY',
  'CONTACT',
  'IP_ADDRESS',
  'USAGE_DATA',
  'TECHNICAL_LOGS',
  'COOKIE_DATA',
])

export const LEGAL_STATUS_KEYS = [
  'entrepreneurIndividuel',
  'sarl',
  'sas',
  'sa',
  'incorporated',
] as const
const LegalStatusKeySchema = z.enum(LEGAL_STATUS_KEYS)

const RegistrationTypeSchema = z.enum(['RCS', 'RNE', 'RM', 'RSAC'])

const SiretSchema = z.string().regex(/^\d{14}$/, 'SIRET: 14 chiffres')
const VatNumberSchema = z
  .string()
  .regex(/^[A-Z]{2}\d{9,12}$/, 'TVA: ISO pays + 9 à 12 chiffres')
const ApeCodeSchema = z.string().regex(/^\d{4}[A-Z]$/, 'APE: 4 chiffres + 1 lettre majuscule')
const CountryIsoSchema = z.string().regex(/^[A-Z]{2}$/, 'ISO 3166-1 alpha-2 (ex: FR, LU, US)')
const CurrencyIsoSchema = z.string().regex(/^[A-Z]{3}$/, 'ISO 4217 (ex: EUR, USD)')

export const AddressSchema = z.object({
  street: z.string().min(1),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  country: CountryIsoSchema,
})

export const LegalEntitySchema = z
  .object({
    slug: z.string().min(1),
    name: z.string().min(1),
    legalStatusKey: LegalStatusKeySchema,
    siret: SiretSchema.nullable(),
    vatNumber: VatNumberSchema.nullable(),
    rcsCity: z.string().min(1).nullable(),
    phone: z.string().min(1).nullable(),
    capitalAmount: z.number().int().positive().nullable(),
    capitalCurrency: CurrencyIsoSchema.nullable(),
    address: AddressSchema,
  })
  .refine(
    (d) => (d.capitalAmount === null) === (d.capitalCurrency === null),
    { message: 'capitalAmount et capitalCurrency doivent être co-définis ou co-null' },
  )

export const PublisherSchema = z.object({
  legalEntitySlug: z.string().min(1),
  apeCode: ApeCodeSchema,
  registrationType: RegistrationTypeSchema,
  vatRegime: VatRegimeSchema,
  publicEmail: z.email(),
})

export const DataProcessingSchema = z.object({
  slug: z.string().min(1),
  processorLegalEntitySlug: z.string().min(1),
  kind: ProcessingKindSchema,
  purposeFr: z.string().min(1),
  purposeEn: z.string().min(1),
  dataCategories: z.array(DataCategorySchema).min(1),
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
    phone: null,
    capitalAmount: null,
    capitalCurrency: null,
    address: {
      street: '11 rue Gouvy',
      postalCode: '57000',
      city: 'Metz',
      country: 'FR',
    },
  },
  {
    slug: 'ionos-sarl',
    name: 'IONOS SARL',
    legalStatusKey: 'sarl',
    siret: '43130377500016',
    vatNumber: 'FR13431303775',
    rcsCity: 'Sarreguemines',
    phone: '+33 9 70 80 89 11',
    capitalAmount: 100000,
    capitalCurrency: 'EUR',
    address: {
      street: '7 place de la Gare',
      postalCode: '57200',
      city: 'Sarreguemines',
      country: 'FR',
    },
  },
  {
    slug: 'calendly-inc',
    name: 'Calendly LLC',
    legalStatusKey: 'incorporated',
    siret: null,
    vatNumber: null,
    rcsCity: null,
    phone: null,
    capitalAmount: null,
    capitalCurrency: null,
    address: {
      street: '271 17th St NW, Suite 1000',
      postalCode: '30363',
      city: 'Atlanta',
      country: 'US',
    },
  },
  {
    slug: 'foyer-group-sa',
    name: 'Foyer S.A.',
    legalStatusKey: 'sa',
    siret: null,
    vatNumber: null,
    rcsCity: 'Luxembourg',
    phone: null,
    capitalAmount: null,
    capitalCurrency: null,
    address: {
      street: '12 rue Léon Laval',
      postalCode: 'L-3372',
      city: 'Leudelange',
      country: 'LU',
    },
  },
  {
    slug: 'cloudsmart-sarl',
    name: 'CloudSmart S.à r.l.',
    legalStatusKey: 'sarl',
    siret: null,
    vatNumber: null,
    rcsCity: 'Luxembourg',
    phone: null,
    capitalAmount: null,
    capitalCurrency: null,
    address: {
      street: '44 rue du Commerce',
      postalCode: 'L-3540',
      city: 'Dudelange',
      country: 'LU',
    },
  },
  {
    slug: 'wantedesign-sas',
    name: 'Wantedesign SAS',
    legalStatusKey: 'sas',
    siret: '94775459400010',
    vatNumber: null,
    rcsCity: 'Paris',
    phone: null,
    capitalAmount: 15000,
    capitalCurrency: 'EUR',
    address: {
      street: '10 rue de la Bourse',
      postalCode: '75002',
      city: 'Paris',
      country: 'FR',
    },
  },
]

export const publisher: PublisherInput = {
  legalEntitySlug: 'thibaud',
  apeCode: '6201Z',
  registrationType: 'RNE',
  vatRegime: 'FRANCHISE',
  publicEmail: 'contact@thibaud-geisler.com',
}

export const dataProcessings: DataProcessingInput[] = [
  {
    slug: 'ionos-hosting',
    processorLegalEntitySlug: 'ionos-sarl',
    kind: 'HOSTING',
    purposeFr: 'Hébergement infrastructure VPS et base de données PostgreSQL',
    purposeEn: 'VPS infrastructure and PostgreSQL database hosting',
    dataCategories: ['IP_ADDRESS', 'TECHNICAL_LOGS'],
    retentionPolicyKey: 'logs3Years',
    legalBasis: 'LEGITIMATE_INTERESTS',
    outsideEuFramework: null,
    displayOrder: 0,
  },
  {
    slug: 'calendly-embedded',
    processorLegalEntitySlug: 'calendly-inc',
    kind: 'EMBEDDED_SERVICE',
    purposeFr: 'Affichage du widget de prise de rendez-vous embarqué (iframe Calendly)',
    purposeEn: 'Display of embedded scheduling widget (Calendly iframe)',
    dataCategories: ['IDENTITY', 'CONTACT', 'USAGE_DATA', 'COOKIE_DATA'],
    retentionPolicyKey: 'session13Months',
    legalBasis: 'CONSENT',
    outsideEuFramework: 'DATA_PRIVACY_FRAMEWORK',
    displayOrder: 1,
  },
  {
    slug: 'ionos-smtp',
    processorLegalEntitySlug: 'ionos-sarl',
    kind: 'EMAIL_PROVIDER',
    purposeFr: 'Envoi des emails transactionnels du formulaire de contact via serveur SMTP authentifié',
    purposeEn: 'Transactional email delivery from contact form via authenticated SMTP server',
    dataCategories: ['IDENTITY', 'CONTACT'],
    retentionPolicyKey: 'logs30Days',
    legalBasis: 'LEGITIMATE_INTERESTS',
    outsideEuFramework: null,
    displayOrder: 2,
  },
]
