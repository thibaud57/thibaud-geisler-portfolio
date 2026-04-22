import type {
  ContractStatus,
  ProjectFormat,
  ProjectStatus,
  ProjectType,
  WorkMode,
} from '@/generated/prisma/client'

/**
 * Project input shape consumed by `prisma/seed.ts` (upsert by slug).
 *
 * @see docs/superpowers/specs/projets/03-seed-projets-design.md
 */
export type ProjectInput = {
  slug: string
  title: string
  description: string
  type: ProjectType
  status: ProjectStatus
  formats: ProjectFormat[]
  startedAt: Date | null
  endedAt: Date | null
  githubUrl: string | null
  demoUrl: string | null
  coverFilename: string | null
  displayOrder: number
  /**
   * Liste ORDONNÉE des slugs de tags liés au projet.
   * L'ordre détermine `ProjectTag.displayOrder` (index dans le tableau, 0 en premier).
   * Chaque slug doit exister dans `tags.ts`, sinon le seed lève une erreur FK.
   */
  tagSlugs: string[]
  /**
   * Méta-données CLIENT uniquement. null pour les projets PERSONAL.
   * `companySlug` doit référencer une entrée de `companies.ts`.
   */
  clientMeta: {
    companySlug: string
    teamSize: number | null
    contractStatus: ContractStatus | null
    workMode: WorkMode
  } | null
}

/**
 * Projets affichés sur le portfolio (CLIENT + PERSONAL).
 *
 * Ordre page liste piloté par `Project.displayOrder` ASC (0 en premier).
 * Ordre des tags par-projet piloté par `ProjectTag.displayOrder` ASC,
 * calculé à partir de l'index dans `tagSlugs[]` au seed.
 *
 * Sections narratives (contexte, réalisations, apprentissages, liens) résolues
 * au seed depuis `./case-studies/<client|personal>/<slug>.md`.
 */
export const projects: ProjectInput[] = [
  {
    slug: 'digiclaims',
    title: 'Digiclaims - Gestion Sinistres',
    description:
      'Webapp Scala/Angular de gestion des sinistres chez Foyer (assurance Luxembourg), architecture microservices CQRS/Event Sourcing. Réduction de 50% du temps de traitement, utilisée par 100+ courtiers.',
    type: 'CLIENT',
    status: 'PUBLISHED',
    formats: ['WEB_APP', 'API'],
    startedAt: new Date('2022-04-01'),
    endedAt: new Date('2025-10-16'),
    githubUrl: null,
    demoUrl: null,
    coverFilename: 'projets/client/foyer/cover.webp',
    displayOrder: 0,
    tagSlugs: [
      'scala',
      'angular',
      'kafka',
      'mongodb',
      'play',
      'docker',
      'kubernetes',
      'github-actions',
      'sentry',
      'datadog',
      'sonarqube',
    ],
    clientMeta: {
      companySlug: 'foyer',
      teamSize: 6,
      contractStatus: 'CDI',
      workMode: 'HYBRIDE',
    },
  },
  {
    slug: 'referent-ia-automatisation',
    title: 'Référent Technique IA & Automatisation',
    description:
      "Référent technique et stratégique IA/automatisation pour une agence digitale. Structuration des offres from scratch (gammes MX/AX), architecture d'agents IA, cadrage avant-vente, mentorat technique, infrastructure et ops.",
    type: 'CLIENT',
    status: 'PUBLISHED',
    formats: ['IA'],
    startedAt: new Date('2026-01-15'),
    endedAt: null,
    githubUrl: null,
    demoUrl: null,
    coverFilename: 'projets/client/wanted-design/cover.webp',
    displayOrder: 1,
    tagSlugs: [
      'agents-ia',
      'skills',
      'automatisation',
      'anthropic',
      'openai',
      'perplexity',
      'n8n',
      'dokploy',
    ],
    clientMeta: {
      companySlug: 'wanted-design',
      teamSize: 4,
      contractStatus: 'FREELANCE',
      workMode: 'REMOTE',
    },
  },
  {
    slug: 'saas-gestion-paie',
    title: 'SaaS Gestion de Paie',
    description:
      "Plateforme SaaS de gestion de la paie (Angular/Node.js). Développement de features frontend (stepper d'ajout employé) et d'un module de scraping automatisé (PHP, Puppeteer) pour pré-remplir les fiches de paie depuis un site gouvernemental.",
    type: 'CLIENT',
    status: 'PUBLISHED',
    formats: ['WEB_APP'],
    startedAt: new Date('2021-10-01'),
    endedAt: new Date('2022-04-30'),
    githubUrl: null,
    demoUrl: null,
    coverFilename: 'projets/client/paysystem/cover.webp',
    displayOrder: 6,
    tagSlugs: ['angular', 'nodejs', 'mongodb', 'scraping', 'php'],
    clientMeta: {
      companySlug: 'paysystem',
      teamSize: 4,
      contractStatus: 'CDI',
      workMode: 'HYBRIDE',
    },
  },
  {
    slug: 'erp-odoo-android',
    title: 'ERP Odoo & App Android',
    description:
      "Développement de modules Odoo ERP personnalisés et d'une application Android de scan de médicaments intégrée à l'ERP, déployée en test chez des pharmacies partenaires.",
    type: 'CLIENT',
    status: 'PUBLISHED',
    formats: ['WEB_APP', 'MOBILE_APP'],
    startedAt: new Date('2020-10-01'),
    endedAt: new Date('2021-09-30'),
    githubUrl: null,
    demoUrl: null,
    coverFilename: 'projets/client/cloudsmart/cover.webp',
    displayOrder: 7,
    tagSlugs: ['python', 'odoo', 'android'],
    clientMeta: {
      companySlug: 'cloudsmart',
      teamSize: 5,
      contractStatus: 'ALTERNANCE',
      workMode: 'PRESENTIEL',
    },
  },
  {
    slug: 'portfolio',
    title: 'Thibaud Geisler Portfolio',
    description:
      'Plateforme personnelle Next.js/TypeScript servant de vitrine professionnelle et de fondation technique pour une plateforme freelance évolutive (dashboard admin, chatbot RAG, mini-CRM, blog) à venir post-MVP.',
    type: 'PERSONAL',
    status: 'PUBLISHED',
    formats: ['WEB_APP'],
    startedAt: new Date('2026-04-19'),
    endedAt: null,
    githubUrl: 'https://github.com/thibaud57/thibaud-geisler-portfolio',
    demoUrl: 'https://thibaud-geisler.com',
    coverFilename: null,
    displayOrder: 2,
    tagSlugs: [
      'nextjs',
      'typescript',
      'react',
      'postgresql',
      'nodejs',
      'docker',
      'dokploy',
      'github-actions',
    ],
    clientMeta: null,
  },
  {
    slug: 'techno-scraper',
    title: 'Techno-Scraper',
    description:
      'API Python/FastAPI pour scraper 3 plateformes musicales (Soundcloud, Beatport, Bandcamp) et exposer les données via REST puis via un serveur MCP pour intégration native avec des agents IA.',
    type: 'PERSONAL',
    status: 'PUBLISHED',
    formats: ['API'],
    startedAt: new Date('2025-04-17'),
    endedAt: new Date('2025-04-21'),
    githubUrl: 'https://github.com/thibaud57/techno-scraper',
    demoUrl: null,
    coverFilename: null,
    displayOrder: 4,
    tagSlugs: [
      'mcp',
      'scraping',
      'anti-bot',
      'python',
      'fastapi',
      'docker',
      'dokploy',
      'github-actions',
    ],
    clientMeta: null,
  },
  {
    slug: 'crm-leads-n8n',
    title: 'CRM Leads - Relance Automatisée (n8n)',
    description:
      "Workflow n8n qui automatise la relance de leads CRM : mise à jour d'une date dans Notion déclenche un agent Claude qui rédige un message personnalisé, puis upsert idempotent d'une tâche TickTick de rappel.",
    type: 'PERSONAL',
    status: 'PUBLISHED',
    formats: ['IA'],
    startedAt: new Date('2025-12-08'),
    endedAt: new Date('2025-12-08'),
    githubUrl:
      'https://github.com/thibaud57/n8n-backups/blob/main/workflows/work/ybAxfufVGPJPln2i.json',
    demoUrl: null,
    coverFilename: null,
    displayOrder: 5,
    tagSlugs: [
      'agents-ia',
      'automatisation',
      'n8n',
      'anthropic',
      'docker',
      'dokploy',
    ],
    clientMeta: null,
  },
  {
    slug: 'flight-search-api',
    title: 'Flight Search API',
    description:
      'API Python/FastAPI pour trouver les vols multi-destinations les moins chers en testant toutes les combinaisons de dates possibles, avec anti-détection avancé (Crawl4AI, Patchright, proxies résidentiels) face aux protections anti-bot de Google Flights et Kayak.',
    type: 'PERSONAL',
    status: 'PUBLISHED',
    formats: ['API'],
    startedAt: new Date('2025-11-16'),
    endedAt: new Date('2025-12-06'),
    githubUrl: 'https://github.com/thibaud57/flight-search-api',
    demoUrl: null,
    coverFilename: null,
    displayOrder: 3,
    tagSlugs: [
      'anti-bot',
      'scraping',
      'anonymisation',
      'python',
      'fastapi',
      'docker',
      'dokploy',
      'github-actions',
    ],
    clientMeta: null,
  },
  {
    slug: 'skill-prof',
    title: 'Skill prof - Leçons programmation',
    description:
      "Skill Claude Code et workflow multi-agents pour générer et maintenir automatiquement des fiches de révision techniques denses, calibrées pour développeurs mid/senior, avec audit qualité multi-couche (format, exactitude technique, cohérence cross-leçons).",
    type: 'PERSONAL',
    status: 'PUBLISHED',
    formats: ['IA'],
    startedAt: new Date('2026-04-06'),
    endedAt: new Date('2026-04-10'),
    githubUrl: 'https://github.com/thibaud57/lessons',
    demoUrl: null,
    coverFilename: null,
    displayOrder: 8,
    tagSlugs: ['skills', 'anthropic', 'local'],
    clientMeta: null,
  },
]
