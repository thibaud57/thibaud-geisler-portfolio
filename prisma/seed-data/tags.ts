import type { TagKind } from '@/generated/prisma/client'

/**
 * Tag input shape consumed by `prisma/seed.ts` (upsert by slug).
 *
 * @see docs/superpowers/specs/projets/03-seed-projets-design.md
 */
export type TagInput = {
  slug: string
  name: string
  kind: TagKind
  /**
   * Format `"<lib>:<slug>"` où `lib ∈ { 'simple-icons', 'lucide' }`.
   * null = fallback texte seul dans le badge UI.
   * Validation du format runtime via Zod dans `prisma/seed.ts`.
   */
  icon: string | null
  // Pas de displayOrder : l'ordre d'affichage des tags est par-projet via `ProjectTag.displayOrder`.
}

/**
 * Référentiel plat des tags (technos + infra + IA + expertises).
 *
 * Source : curation pré-plan, agrégée depuis les 2 DBs Notion Projets (champs
 * Technologies, Infra, Expertises) + DB Entreprises. Enrichi manuellement.
 *
 * Icons :
 * - `simple-icons:*` pour les technos et entreprises (simpleicons.org)
 * - `lucide:*` pour les concepts et expertises (lucide.dev)
 * - `null` si aucun glyphe ne convient (fallback texte dans le badge UI)
 *
 * Naming IA : format `Produit (Entreprise)` pour expliciter la relation
 * produit/éditeur (ex: `Claude (Anthropic)`, `ChatGPT (OpenAI)`).
 */
export const tags: TagInput[] = [
  // === LANGUAGE (5) ===
  { slug: 'typescript', name: 'TypeScript', kind: 'LANGUAGE', icon: 'simple-icons:typescript' },
  { slug: 'scala', name: 'Scala', kind: 'LANGUAGE', icon: 'simple-icons:scala' },
  { slug: 'java', name: 'Java', kind: 'LANGUAGE', icon: 'simple-icons:openjdk' },
  { slug: 'python', name: 'Python', kind: 'LANGUAGE', icon: 'simple-icons:python' },
  { slug: 'php', name: 'PHP', kind: 'LANGUAGE', icon: 'simple-icons:php' },

  // === FRAMEWORK (11) ===
  { slug: 'nextjs', name: 'Next.js', kind: 'FRAMEWORK', icon: 'simple-icons:nextdotjs' },
  { slug: 'react', name: 'React', kind: 'FRAMEWORK', icon: 'simple-icons:react' },
  { slug: 'nodejs', name: 'Node.js', kind: 'FRAMEWORK', icon: 'simple-icons:nodedotjs' },
  { slug: 'nestjs', name: 'NestJS', kind: 'FRAMEWORK', icon: 'simple-icons:nestjs' },
  { slug: 'angular', name: 'Angular', kind: 'FRAMEWORK', icon: 'simple-icons:angular' },
  { slug: 'fastapi', name: 'FastAPI', kind: 'FRAMEWORK', icon: 'simple-icons:fastapi' },
  { slug: 'spring-boot', name: 'Spring Boot', kind: 'FRAMEWORK', icon: 'simple-icons:springboot' },
  { slug: 'spring', name: 'Spring', kind: 'FRAMEWORK', icon: 'simple-icons:spring' },
  { slug: 'play', name: 'Play', kind: 'FRAMEWORK', icon: 'lucide:chevron-right' },
  { slug: 'android', name: 'Android', kind: 'FRAMEWORK', icon: 'simple-icons:android' },
  { slug: 'odoo', name: 'Odoo', kind: 'FRAMEWORK', icon: 'simple-icons:odoo' },

  // === DATABASE (2) ===
  { slug: 'postgresql', name: 'PostgreSQL', kind: 'DATABASE', icon: 'simple-icons:postgresql' },
  { slug: 'mongodb', name: 'MongoDB', kind: 'DATABASE', icon: 'simple-icons:mongodb' },

  // === AI (5) ===
  { slug: 'anthropic', name: 'Claude (Anthropic)', kind: 'AI', icon: 'simple-icons:anthropic' },
  { slug: 'openai', name: 'ChatGPT (OpenAI)', kind: 'AI', icon: 'simple-icons:openai' },
  { slug: 'n8n', name: 'n8n', kind: 'AI', icon: 'simple-icons:n8n' },
  { slug: 'perplexity', name: 'Perplexity', kind: 'AI', icon: 'simple-icons:perplexity' },
  { slug: 'piagent', name: 'PiAgent', kind: 'AI', icon: 'lucide:bot' },

  // === INFRA (10) ===
  { slug: 'docker', name: 'Docker', kind: 'INFRA', icon: 'simple-icons:docker' },
  { slug: 'github-actions', name: 'GitHub Actions', kind: 'INFRA', icon: 'simple-icons:githubactions' },
  { slug: 'kubernetes', name: 'Kubernetes', kind: 'INFRA', icon: 'simple-icons:kubernetes' },
  { slug: 'dokploy', name: 'Dokploy', kind: 'INFRA', icon: 'lucide:ship' },
  { slug: 'vercel', name: 'Vercel', kind: 'INFRA', icon: 'simple-icons:vercel' },
  { slug: 'kafka', name: 'Kafka', kind: 'INFRA', icon: 'simple-icons:apachekafka' },
  { slug: 'sentry', name: 'Sentry', kind: 'INFRA', icon: 'simple-icons:sentry' },
  { slug: 'datadog', name: 'Datadog', kind: 'INFRA', icon: 'simple-icons:datadog' },
  { slug: 'sonarqube', name: 'SonarQube', kind: 'INFRA', icon: 'simple-icons:sonarqube' },
  { slug: 'local', name: 'Local', kind: 'INFRA', icon: 'lucide:monitor' },

  // === EXPERTISE (8) ===
  { slug: 'scraping', name: 'Scraping', kind: 'EXPERTISE', icon: 'lucide:bug' },
  { slug: 'anti-bot', name: 'Anti-bot', kind: 'EXPERTISE', icon: 'lucide:shield-ban' },
  { slug: 'anonymisation', name: 'Anonymisation', kind: 'EXPERTISE', icon: 'lucide:ghost' },
  { slug: 'rag', name: 'RAG', kind: 'EXPERTISE', icon: 'lucide:database' },
  { slug: 'mcp', name: 'MCP', kind: 'EXPERTISE', icon: 'lucide:plug' },
  { slug: 'agents-ia', name: 'Agents IA', kind: 'EXPERTISE', icon: 'lucide:brain-circuit' },
  { slug: 'skills', name: 'Skills', kind: 'EXPERTISE', icon: 'lucide:sparkles' },
  { slug: 'automatisation', name: 'Automatisation', kind: 'EXPERTISE', icon: 'lucide:workflow' },
]
