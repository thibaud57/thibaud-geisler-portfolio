import type {
  ContractStatus,
  ProjectFormat,
  ProjectStatus,
  ProjectType,
  WorkMode,
} from '@/generated/prisma/client'

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
  // L'index du slug dans tagSlugs[] pilote ProjectTag.displayOrder au seed (0 en premier)
  tagSlugs: string[]
  // companySlug doit exister dans companies.ts. Les projets PERSONAL pointent sur slug 'personnel'.
  clientMeta: {
    companySlug: string
    teamSize: number | null
    contractStatus: ContractStatus | null
    workMode: WorkMode
  } | null
}

// Sections narratives résolues au seed depuis ./case-studies/<client|personal>/<slug>.md
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
    displayOrder: 1,
    tagSlugs: [
      'scala',
      'angular',
      'kafka',
      'play',
      'mongodb',
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
    displayOrder: 0,
    tagSlugs: [
      'agents-ia',
      'automatisation',
      'n8n',
      'skills',
      'anthropic',
      'openai',
      'perplexity',
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
    displayOrder: 7,
    tagSlugs: ['angular', 'nodejs', 'php', 'scraping', 'mongodb'],
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
    displayOrder: 8,
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
    coverFilename: 'projets/personal/portfolio/cover.webp',
    displayOrder: 2,
    clientMeta: { companySlug: 'personnel', teamSize: null, contractStatus: null, workMode: 'REMOTE' },
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
  },
  {
    slug: 'techno-scraper',
    title: 'Techno Scraper',
    description:
      'API Python/FastAPI pour scraper 3 plateformes musicales (Soundcloud, Beatport, Bandcamp) et exposer les données via REST puis via un serveur MCP pour intégration native avec des agents IA.',
    type: 'PERSONAL',
    status: 'PUBLISHED',
    formats: ['API'],
    startedAt: new Date('2025-04-17'),
    endedAt: new Date('2025-04-21'),
    githubUrl: 'https://github.com/thibaud57/techno-scraper',
    demoUrl: null,
    coverFilename: 'projets/personal/techno-scraper/cover.webp',
    displayOrder: 5,
    clientMeta: { companySlug: 'personnel', teamSize: null, contractStatus: null, workMode: 'REMOTE' },
    tagSlugs: [
      'python',
      'scraping',
      'mcp',
      'fastapi',
      'anti-bot',
      'docker',
      'dokploy',
      'github-actions',
    ],
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
    coverFilename: 'projets/personal/crm-leads-n8n/cover.webp',
    displayOrder: 4,
    clientMeta: { companySlug: 'personnel', teamSize: null, contractStatus: null, workMode: 'REMOTE' },
    tagSlugs: [
      'agents-ia',
      'automatisation',
      'n8n',
      'anthropic',
      'docker',
      'dokploy',
    ],
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
    coverFilename: 'projets/personal/flight-search-api/cover.webp',
    displayOrder: 3,
    clientMeta: { companySlug: 'personnel', teamSize: null, contractStatus: null, workMode: 'REMOTE' },
    tagSlugs: [
      'scraping',
      'anti-bot',
      'anonymisation',
      'python',
      'fastapi',
      'docker',
      'dokploy',
      'github-actions',
    ],
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
    coverFilename: 'projets/personal/skill-prof/cover.webp',
    displayOrder: 6,
    clientMeta: { companySlug: 'personnel', teamSize: null, contractStatus: null, workMode: 'REMOTE' },
    tagSlugs: ['skills', 'anthropic', 'local'],
  },
]
